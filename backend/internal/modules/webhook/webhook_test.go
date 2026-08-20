package webhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func setupTestDB(t *testing.T) *sqlx.DB {
	db, err := sqlx.Connect("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open test in-memory db: %v", err)
	}

	schema := `
	CREATE TABLE IF NOT EXISTS webhook_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
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
	`
	_, err = db.Exec(schema)
	if err != nil {
		t.Fatalf("Failed to create webhook_logs schema: %v", err)
	}
	return db
}

func TestGenerateSignature(t *testing.T) {
	payload := []byte(`{"event":"payment.success","amount":500000}`)
	secret := "whsec_test_secret_key_123"

	sig := GenerateSignature(payload, secret)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))

	if sig != expected {
		t.Fatalf("HMAC signature mismatch: got %s, expected %s", sig, expected)
	}
}

func TestDispatchSync(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	var receivedHeaderSig string
	var receivedBody Payload

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedHeaderSig = r.Header.Get("X-Sendago-Signature")
		_ = json.NewDecoder(r.Body).Decode(&receivedBody)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	defer server.Close()

	dispatcher := NewDispatcher(db)

	metadata := json.RawMessage(`{"jenjang":"SMP","gelombang":"Gelombang 1","no_pendaftaran":"REG-001"}`)
	payload := Payload{
		Event:         "payment.success",
		TransactionID: "tx-test-123",
		OrderID:       "PMB-SMP-001",
		Amount:        350000,
		UniqueCode:    142,
		TotalAmount:   350142,
		Status:        "PAID",
		Channel:       "QRIS",
		Metadata:      metadata,
		Timestamp:     time.Now().Unix(),
	}

	secret := "whsec_live_abcdef123456"
	isSuccess, statusCode, body, err := dispatcher.DispatchSync("app-1", "tx-test-123", "payment.success", server.URL, secret, payload)

	if err != nil {
		t.Fatalf("DispatchSync failed: %v", err)
	}
	if !isSuccess || statusCode != 200 {
		t.Fatalf("Expected 200 OK success, got status %d, isSuccess=%v, body=%s", statusCode, isSuccess, body)
	}
	if receivedBody.OrderID != "PMB-SMP-001" {
		t.Errorf("Expected received order_id 'PMB-SMP-001', got %s", receivedBody.OrderID)
	}
	if receivedHeaderSig == "" {
		t.Errorf("Expected X-Sendago-Signature header to be non-empty")
	}
}
