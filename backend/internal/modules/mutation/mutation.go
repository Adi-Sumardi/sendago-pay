package mutation

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"sendagopay-backend/internal/config"
	"sendagopay-backend/internal/mailer"
	"sendagopay-backend/internal/redis"
	"sendagopay-backend/internal/uniquecode"
	"sendagopay-backend/internal/modules/payment"
	"sendagopay-backend/internal/modules/webhook"
)

type Mutation struct {
	ID                   string          `json:"id" db:"id"`
	BankSource           string          `json:"bank_source" db:"bank_source"`
	Type                 string          `json:"type" db:"type"`
	Amount               float64         `json:"amount" db:"amount"`
	Description          string          `json:"description" db:"description"`
	MatchedTransactionID *string         `json:"matched_transaction_id" db:"matched_transaction_id"`
	RawPayload           json.RawMessage `json:"raw_payload" db:"raw_payload"`
	CreatedAt            time.Time       `json:"created_at" db:"created_at"`
}

type Handler struct {
	db         *sqlx.DB
	rdb        *redis.Client
	codeGen    *uniquecode.Generator
	dispatcher *webhook.Dispatcher
	mailer     *mailer.Mailer
}

func NewHandler(db *sqlx.DB, rdb *redis.Client, cfg *config.Config, codeGen *uniquecode.Generator, dispatcher *webhook.Dispatcher) *Handler {
	return &Handler{
		db:         db,
		rdb:        rdb,
		codeGen:    codeGen,
		dispatcher: dispatcher,
		mailer:     mailer.New(cfg.SendagoMailEndpoint, cfg.SendagoMailMemberID, cfg.SendagoMailSecret, cfg.SendagoMailFromAddr),
	}
}

type InboundMutationRequest struct {
	BankSource  string  `json:"bank_source"` // BCA, MANDIRI, DANA, GOBIZ, etc.
	Type        string  `json:"type"`        // CR (credit/in) or DB (debit/out)
	Amount      float64 `json:"amount" binding:"required"`
	Description string  `json:"description"`
}

// InboundMutationWebhook handles incoming mutation from Bank Scraper / Push Notification / Aggregator
func (h *Handler) InboundMutationWebhook(c *gin.Context) {
	var req InboundMutationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	mutationID := uuid.New().String()
	rawBytes, _ := json.Marshal(req)

	// Filter only Credit (money in)
	if req.Type != "CR" && req.Type != "" {
		_, _ = h.db.Exec(`
			INSERT INTO bank_mutations (id, bank_source, type, amount, description, raw_payload)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, mutationID, req.BankSource, req.Type, req.Amount, req.Description, rawBytes)

		c.JSON(http.StatusOK, gin.H{"status": "ignored", "reason": "non-credit mutation"})
		return
	}

	// 1. Find matching PENDING transaction by total_amount
	query := `
		SELECT t.*, a.name as app_name, a.webhook_url, a.webhook_secret
		FROM transactions t
		JOIN apps a ON t.app_id = a.id
		WHERE t.status = 'PENDING' AND t.total_amount = ?
		ORDER BY t.created_at ASC
		LIMIT 1
	`
	var matchedApp struct {
		payment.Transaction
		WebhookURL    string `db:"webhook_url"`
		WebhookSecret string `db:"webhook_secret"`
	}

	err := h.db.Get(&matchedApp, query, req.Amount)
	if err != nil {
		queryPos := `
			SELECT t.*, a.name as app_name, a.webhook_url, a.webhook_secret
			FROM transactions t
			JOIN apps a ON t.app_id = a.id
			WHERE t.status = 'PENDING' AND t.total_amount = $1
			ORDER BY t.created_at ASC
			LIMIT 1
		`
		err = h.db.Get(&matchedApp, queryPos, req.Amount)
	}

	var matchedTxID *string

	if err == nil && matchedApp.ID != "" {
		now := time.Now()
		matchedTxID = &matchedApp.ID

		// Update transaction status to PAID
		updateQuery := `
			UPDATE transactions 
			SET status = 'PAID', paid_at = ?, updated_at = ? 
			WHERE id = ?
		`
		res, _ := h.db.Exec(updateQuery, now, now, matchedApp.ID)
		if res == nil {
			updateQueryPos := `
				UPDATE transactions 
				SET status = 'PAID', paid_at = $1, updated_at = $1 
				WHERE id = $2
			`
			_, _ = h.db.Exec(updateQueryPos, now, matchedApp.ID)
		}

		// Release unique code lock
		ctx := c.Request.Context()
		_ = h.codeGen.ReleaseUniqueCode(ctx, int64(matchedApp.Amount), matchedApp.UniqueCode)

		// Broadcast real-time SSE event to checkout page
		_ = h.rdb.Publish(ctx, fmt.Sprintf("payment_status:%s", matchedApp.ID), "PAID")

		// Dispatch Outbound Webhook to Client App
		webhookPayload := webhook.Payload{
			Event:         "payment.success",
			TransactionID: matchedApp.ID,
			OrderID:       matchedApp.OrderID,
			Amount:        matchedApp.Amount,
			UniqueCode:    matchedApp.UniqueCode,
			TotalAmount:   matchedApp.TotalAmount,
			Status:        "PAID",
			Channel:       matchedApp.Channel,
			PaidAt:        &now,
			Timestamp:     now.Unix(),
		}

		h.dispatcher.Dispatch(
			matchedApp.AppID,
			matchedApp.ID,
			"payment.success",
			matchedApp.WebhookURL,
			matchedApp.WebhookSecret,
			webhookPayload,
		)

		// Dispatch Payment Receipt via sendagomail.adilabs.id
		if matchedApp.CustomerEmail != "" {
			go func() {
				_, _ = h.mailer.SendPaymentSuccessEmail(
					matchedApp.CustomerEmail,
					matchedApp.CustomerName,
					matchedApp.OrderID,
					matchedApp.AppName,
					matchedApp.Amount,
					matchedApp.TotalAmount,
					matchedApp.Channel,
				)
			}()
		}

		log.Printf("[Mutation] Successfully reconciled payment %s (Amount: %.2f)", matchedApp.ID, req.Amount)
	}

	// 2. Log bank mutation record
	_, err = h.db.Exec(`
		INSERT INTO bank_mutations (id, bank_source, type, amount, description, matched_transaction_id, raw_payload)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, mutationID, req.BankSource, req.Type, req.Amount, req.Description, matchedTxID, rawBytes)

	if err != nil {
		_, _ = h.db.Exec(`
			INSERT INTO bank_mutations (id, bank_source, type, amount, description, matched_transaction_id, raw_payload)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, mutationID, req.BankSource, req.Type, req.Amount, req.Description, matchedTxID, rawBytes)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":                 "processed",
		"mutation_id":            mutationID,
		"matched_transaction_id": matchedTxID,
	})
}

// ManualReconcile marks a transaction as PAID manually from admin dashboard
func (h *Handler) ManualReconcile(c *gin.Context) {
	txID := c.Param("id")

	var matchedApp struct {
		payment.Transaction
		WebhookURL    string `db:"webhook_url"`
		WebhookSecret string `db:"webhook_secret"`
	}

	query := `
		SELECT t.*, a.name as app_name, a.webhook_url, a.webhook_secret
		FROM transactions t
		JOIN apps a ON t.app_id = a.id
		WHERE t.id = ? LIMIT 1
	`
	err := h.db.Get(&matchedApp, query, txID)
	if err != nil {
		queryPos := `
			SELECT t.*, a.name as app_name, a.webhook_url, a.webhook_secret
			FROM transactions t
			JOIN apps a ON t.app_id = a.id
			WHERE t.id = $1 LIMIT 1
		`
		err = h.db.Get(&matchedApp, queryPos, txID)
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	if matchedApp.Status == "PAID" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Transaction already paid"})
		return
	}

	now := time.Now()
	_, _ = h.db.Exec("UPDATE transactions SET status = 'PAID', paid_at = ?, updated_at = ? WHERE id = ?", now, now, txID)
	_, _ = h.db.Exec("UPDATE transactions SET status = 'PAID', paid_at = $1, updated_at = $1 WHERE id = $2", now, txID)

	ctx := c.Request.Context()
	_ = h.codeGen.ReleaseUniqueCode(ctx, int64(matchedApp.Amount), matchedApp.UniqueCode)
	_ = h.rdb.Publish(ctx, fmt.Sprintf("payment_status:%s", matchedApp.ID), "PAID")

	webhookPayload := webhook.Payload{
		Event:         "payment.success",
		TransactionID: matchedApp.ID,
		OrderID:       matchedApp.OrderID,
		Amount:        matchedApp.Amount,
		UniqueCode:    matchedApp.UniqueCode,
		TotalAmount:   matchedApp.TotalAmount,
		Status:        "PAID",
		Channel:       matchedApp.Channel,
		PaidAt:        &now,
		Timestamp:     now.Unix(),
	}

	h.dispatcher.Dispatch(
		matchedApp.AppID,
		matchedApp.ID,
		"payment.success",
		matchedApp.WebhookURL,
		matchedApp.WebhookSecret,
		webhookPayload,
	)

	// Dispatch Payment Receipt via sendagomail.adilabs.id
	if matchedApp.CustomerEmail != "" {
		go func() {
			_, _ = h.mailer.SendPaymentSuccessEmail(
				matchedApp.CustomerEmail,
				matchedApp.CustomerName,
				matchedApp.OrderID,
				matchedApp.AppName,
				matchedApp.Amount,
				matchedApp.TotalAmount,
				matchedApp.Channel,
			)
		}()
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Transaction marked as PAID successfully"})
}
