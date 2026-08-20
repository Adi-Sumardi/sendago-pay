package mutation

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"

	"sendagopay-backend/internal/config"
	"sendagopay-backend/internal/modules/webhook"
	"sendagopay-backend/internal/redis"
	"sendagopay-backend/internal/uniquecode"
)

func setupMutationTestEnv(t *testing.T) (*sqlx.DB, *Handler, *gin.Engine) {
	gin.SetMode(gin.TestMode)

	db, err := sqlx.Connect("sqlite", "file:memdb_mutation?mode=memory&cache=shared")
	if err != nil {
		t.Fatalf("Failed to open sqlite: %v", err)
	}
	db.SetMaxOpenConns(1) // Single connection for in-memory sqlite test stability

	schema := `
	CREATE TABLE merchants (
		id TEXT PRIMARY KEY,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		name TEXT NOT NULL,
		master_qris TEXT DEFAULT '',
		bank_name TEXT DEFAULT 'BCA',
		bank_account_number TEXT DEFAULT '',
		bank_account_name TEXT DEFAULT '',
		totp_secret TEXT DEFAULT '',
		is_2fa_enabled INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE apps (
		id TEXT PRIMARY KEY,
		merchant_id TEXT NOT NULL,
		name TEXT NOT NULL,
		description TEXT DEFAULT '',
		public_key TEXT UNIQUE NOT NULL,
		secret_key TEXT UNIQUE NOT NULL,
		webhook_url TEXT DEFAULT '',
		webhook_secret TEXT NOT NULL,
		is_active INTEGER DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE transactions (
		id TEXT PRIMARY KEY,
		app_id TEXT NOT NULL,
		order_id TEXT NOT NULL,
		amount REAL NOT NULL,
		unique_code INTEGER DEFAULT 0,
		total_amount REAL NOT NULL,
		channel TEXT NOT NULL DEFAULT 'QRIS',
		status TEXT NOT NULL DEFAULT 'PENDING',
		customer_name TEXT DEFAULT '',
		customer_email TEXT DEFAULT '',
		customer_phone TEXT DEFAULT '',
		qris_payload TEXT DEFAULT '',
		notes TEXT DEFAULT '',
		metadata TEXT DEFAULT '{}',
		redirect_url TEXT DEFAULT '',
		expired_at DATETIME NOT NULL,
		paid_at DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE bank_mutations (
		id TEXT PRIMARY KEY,
		bank_source TEXT NOT NULL,
		type TEXT NOT NULL DEFAULT 'CR',
		amount REAL NOT NULL,
		description TEXT DEFAULT '',
		matched_transaction_id TEXT,
		raw_payload TEXT DEFAULT '{}',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE webhook_logs (
		id TEXT PRIMARY KEY,
		app_id TEXT NOT NULL,
		transaction_id TEXT NOT NULL,
		event TEXT NOT NULL,
		target_url TEXT NOT NULL,
		request_headers TEXT DEFAULT '{}',
		request_payload TEXT NOT NULL,
		response_status INTEGER DEFAULT 0,
		response_body TEXT DEFAULT '',
		attempt_count INTEGER DEFAULT 1,
		is_success INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	INSERT INTO apps (id, merchant_id, name, public_key, secret_key, webhook_url, webhook_secret)
	VALUES ('app-school', 'm-1', 'PPDB Sekolah', 'pk_123', 'sk_123', 'http://localhost:9999/wh', 'whsec_test');

	INSERT INTO transactions (id, app_id, order_id, amount, unique_code, total_amount, channel, status, customer_name, customer_email, metadata, expired_at)
	VALUES ('tx-spp-01', 'app-school', 'SPP-SMA-01', 500000, 247, 500247, 'BANK_TRANSFER', 'PENDING', 'Ahmad Dani', 'ahmad@gmail.com', '{"jenjang":"SMA","kelas":"10A"}', DATETIME('now', '+30 minute'));
	`
	_, err = db.Exec(schema)
	if err != nil {
		t.Fatalf("Failed to execute mutation test schema: %v", err)
	}

	rdb := redis.Connect("memory")
	cfg := &config.Config{}
	codeGen := uniquecode.NewGenerator(rdb)
	dispatcher := webhook.NewDispatcher(db)
	handler := NewHandler(db, rdb, cfg, codeGen, dispatcher)

	r := gin.New()
	r.POST("/v1/mutations/webhook", handler.InboundMutationWebhook)
	r.POST("/v1/transactions/:id/reconcile", handler.ManualReconcile)

	return db, handler, r
}

func TestInboundMutationReconciliation(t *testing.T) {
	db, _, router := setupMutationTestEnv(t)
	defer db.Close()

	// Simulate incoming bank mutation with exact total amount 500247
	mutReq := InboundMutationRequest{
		BankSource:  "BCA",
		Type:        "CR",
		Amount:      500247,
		Description: "TRSF M-BANKING CR 500247 AHMAD DANI",
	}

	bodyBytes, _ := json.Marshal(mutReq)
	req := httptest.NewRequest("POST", "/v1/mutations/webhook", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200 OK, got %d", w.Code)
	}

	// Verify transaction status in DB became PAID
	var status string
	var paidAt *time.Time
	_ = db.Get(&status, "SELECT status FROM transactions WHERE id = 'tx-spp-01'")
	_ = db.Get(&paidAt, "SELECT paid_at FROM transactions WHERE id = 'tx-spp-01'")

	if status != "PAID" {
		t.Errorf("Expected transaction status to be 'PAID', got %s", status)
	}
	if paidAt == nil {
		t.Errorf("Expected paid_at timestamp to be set")
	}

	// Verify mutation was matched and logged
	var matchedTxID string
	_ = db.Get(&matchedTxID, "SELECT matched_transaction_id FROM bank_mutations WHERE amount = 500247 LIMIT 1")
	if matchedTxID != "tx-spp-01" {
		t.Errorf("Expected matched_transaction_id 'tx-spp-01', got %s", matchedTxID)
	}
}

func TestConcurrentDuplicateMutations(t *testing.T) {
	db, _, router := setupMutationTestEnv(t)
	defer db.Close()

	// Simulate 10 duplicate mutation webhooks hitting concurrently
	concurrency := 10
	var wg sync.WaitGroup

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			mutReq := InboundMutationRequest{
				BankSource:  "BCA",
				Type:        "CR",
				Amount:      500247,
				Description: "DUPLICATE WEBHOOK HIT",
			}
			b, _ := json.Marshal(mutReq)
			req := httptest.NewRequest("POST", "/v1/mutations/webhook", bytes.NewBuffer(b))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
		}()
	}

	wg.Wait()

	// Ensure transaction is still PAID and never updated into an invalid state
	var status string
	_ = db.Get(&status, "SELECT status FROM transactions WHERE id = 'tx-spp-01'")
	if status != "PAID" {
		t.Errorf("Expected transaction status 'PAID', got %s", status)
	}
}
