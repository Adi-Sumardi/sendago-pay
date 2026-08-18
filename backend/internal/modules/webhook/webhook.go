package webhook

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/jmoiron/sqlx"
)

type Dispatcher struct {
	db         *sqlx.DB
	httpClient *http.Client
}

func NewDispatcher(db *sqlx.DB) *Dispatcher {
	return &Dispatcher{
		db: db,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type Payload struct {
	Event         string      `json:"event"`
	TransactionID string      `json:"transaction_id"`
	OrderID       string      `json:"order_id"`
	Amount        float64     `json:"amount"`
	UniqueCode    int         `json:"unique_code"`
	TotalAmount   float64     `json:"total_amount"`
	Status        string      `json:"status"`
	Channel       string      `json:"channel"`
	PaidAt        *time.Time  `json:"paid_at,omitempty"`
	Timestamp     int64       `json:"timestamp"`
	Data          interface{} `json:"data,omitempty"`
}

// GenerateSignature generates HMAC-SHA256 signature for webhook payload
func GenerateSignature(payloadBytes []byte, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write(payloadBytes)
	return hex.EncodeToString(h.Sum(nil))
}

// Dispatch sends the webhook asynchronously with automatic retry
func (d *Dispatcher) Dispatch(appID, transactionID, event, targetURL, webhookSecret string, payload Payload) {
	if targetURL == "" {
		log.Printf("[Webhook] Skipped: No webhook URL configured for app %s", appID)
		return
	}

	go func() {
		payloadBytes, err := json.Marshal(payload)
		if err != nil {
			log.Printf("[Webhook] Marshal error: %v", err)
			return
		}

		signature := GenerateSignature(payloadBytes, webhookSecret)

		// Try sending with backoff retry (up to 3 attempts in background)
		attempts := []time.Duration{0, 5 * time.Second, 30 * time.Second}

		for attemptCount, delay := range attempts {
			if delay > 0 {
				time.Sleep(delay)
			}

			req, err := http.NewRequest("POST", targetURL, bytes.NewBuffer(payloadBytes))
			if err != nil {
				continue
			}

			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("User-Agent", "SendaGoPay-Webhook/2.0")
			req.Header.Set("X-Sendago-Signature", signature)
			req.Header.Set("X-Sendago-Event", event)
			req.Header.Set("X-Sendago-Timestamp", fmt.Sprintf("%d", payload.Timestamp))

			resp, err := d.httpClient.Do(req)
			var respStatus int = 0
			var respBody string = ""

			if err == nil {
				respStatus = resp.StatusCode
				bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
				respBody = string(bodyBytes)
				resp.Body.Close()
			} else {
				respBody = err.Error()
			}

			isSuccess := respStatus >= 200 && respStatus < 300

			// Save to webhook_logs
			query := `
				INSERT INTO webhook_logs 
				(app_id, transaction_id, event, target_url, request_payload, response_status, response_body, attempt_count, is_success)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			`
			_, _ = d.db.Exec(query, appID, transactionID, event, targetURL, payloadBytes, respStatus, respBody, attemptCount+1, isSuccess)

			if isSuccess {
				log.Printf("[Webhook] Successfully delivered event %s to %s (Status: %d)", event, targetURL, respStatus)
				return
			}

			log.Printf("[Webhook] Attempt %d failed for %s (Status: %d). Retrying...", attemptCount+1, targetURL, respStatus)
		}
	}()
}
