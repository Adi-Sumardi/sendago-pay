package payment

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"

	"sendagopay-backend/internal/config"
	"sendagopay-backend/internal/modules/webhook"
	"sendagopay-backend/internal/redis"
	"sendagopay-backend/internal/uniquecode"
)

func setupTestEnvironment(t *testing.T) (*sqlx.DB, *Handler, *gin.Engine) {
	gin.SetMode(gin.TestMode)

	db, err := sqlx.Connect("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open test in-memory sqlite: %v", err)
	}

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

	INSERT INTO merchants (id, email, password_hash, name, master_qris, bank_name, bank_account_number, bank_account_name)
	VALUES ('m-1', 'admin@sekolah.sch.id', 'hash', 'Yayasan Pendidikan', '00020101021126590013ID.CO.GOPAY.WWW01189360091438291039210215ID10200392019010303UMI51440014ID.CO.QRIS.WWW0215ID10200392019010303UMI5204541153033605802ID5911SendaGo Pay6013Jakarta Pusat61051011062070703A0163046D5E', 'BCA', '1234567890', 'YAYASAN PENDIDIKAN');

	INSERT INTO apps (id, merchant_id, name, public_key, secret_key, webhook_url, webhook_secret)
	VALUES ('app-pmb', 'm-1', 'Portal PPDB Sekolah', 'pk_live_123', 'sk_live_123', 'http://localhost:9999/webhook', 'whsec_123');
	`
	_, err = db.Exec(schema)
	if err != nil {
		t.Fatalf("Failed to initialize test schema: %v", err)
	}

	rdb := redis.Connect("memory")
	cfg := &config.Config{
		DashboardURL:      "http://localhost:3000",
		DefaultMasterQRIS: "00020101021126590013ID.CO.GOPAY.WWW01189360091438291039210215ID10200392019010303UMI51440014ID.CO.QRIS.WWW0215ID10200392019010303UMI5204541153033605802ID5911SendaGo Pay6013Jakarta Pusat61051011062070703A0163046D5E",
		DefaultBankName:   "BCA",
		DefaultBankAccount: "1234567890",
		DefaultBankHolder: "YAYASAN PENDIDIKAN",
	}
	codeGen := uniquecode.NewGenerator(rdb)
	dispatcher := webhook.NewDispatcher(db)
	handler := NewHandler(db, rdb, cfg, codeGen, dispatcher)

	r := gin.New()
	r.POST("/v1/payments", func(c *gin.Context) {
		c.Set("app_id", "app-pmb")
		handler.CreatePayment(c)
	})
	r.GET("/v1/payments/:id", handler.GetPayment)

	return db, handler, r
}

func TestCreatePaymentWithMetadata(t *testing.T) {
	db, _, router := setupTestEnvironment(t)
	defer db.Close()

	reqBody := CreatePaymentRequest{
		OrderID:       "PMB-TK-2026-001",
		Amount:        250000,
		CustomerName:  "Budi Santoso (Orang Tua Ananda Rizky)",
		CustomerEmail: "budi@gmail.com",
		CustomerPhone: "081234567890",
		Notes:         "Formulir Pendaftaran TK Islam Terpadu",
		Metadata: map[string]interface{}{
			"jenjang":        "TK",
			"unit_sekolah":   "TK Islam Terpadu",
			"gelombang":      "Gelombang 1",
			"no_pendaftaran": "REG-TK-001",
		},
		ExpiryMinutes: 30,
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/v1/payments", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Expected HTTP 201 Created, got %d. Body: %s", w.Code, w.Body.String())
	}

	var created Transaction
	err := json.Unmarshal(w.Body.Bytes(), &created)
	if err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if created.OrderID != "PMB-TK-2026-001" {
		t.Errorf("Expected OrderID 'PMB-TK-2026-001', got %s", created.OrderID)
	}
	if created.UniqueCode < 100 || created.UniqueCode > 9999 {
		t.Errorf("Expected unique code > 100, got %d", created.UniqueCode)
	}
	if created.TotalAmount != created.Amount+float64(created.UniqueCode) {
		t.Errorf("Total amount mismatch: %.2f != %.2f + %d", created.TotalAmount, created.Amount, created.UniqueCode)
	}
	if len(created.Metadata) == 0 {
		t.Errorf("Expected metadata to be populated, got empty")
	}

	// Test GET payment info
	getReq := httptest.NewRequest("GET", "/v1/payments/"+created.ID, nil)
	getW := httptest.NewRecorder()
	router.ServeHTTP(getW, getReq)

	if getW.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200 OK for GET /v1/payments/:id, got %d", getW.Code)
	}

	var fetched Transaction
	_ = json.Unmarshal(getW.Body.Bytes(), &fetched)
	if fetched.BankName != "BCA" || fetched.BankAccountNumber != "1234567890" {
		t.Errorf("Bank details not attached properly: %s / %s", fetched.BankName, fetched.BankAccountNumber)
	}
}
