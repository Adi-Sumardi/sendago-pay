package payment

import (
	"context"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"sendagopay-backend/internal/config"
	"sendagopay-backend/internal/modules/webhook"
	"sendagopay-backend/internal/qris"
	"sendagopay-backend/internal/redis"
	"sendagopay-backend/internal/uniquecode"
)

type JSONRaw []byte

func (j *JSONRaw) Scan(value interface{}) error {
	if value == nil {
		*j = []byte("{}")
		return nil
	}
	switch v := value.(type) {
	case []byte:
		*j = append((*j)[0:0], v...)
		return nil
	case string:
		*j = []byte(v)
		return nil
	default:
		return fmt.Errorf("unsupported type: %T", value)
	}
}

func (j JSONRaw) Value() (driver.Value, error) {
	if len(j) == 0 {
		return "{}", nil
	}
	return string(j), nil
}

func (j JSONRaw) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	return j, nil
}

func (j *JSONRaw) UnmarshalJSON(data []byte) error {
	if j == nil {
		return errors.New("JSONRaw: UnmarshalJSON on nil pointer")
	}
	*j = append((*j)[0:0], data...)
	return nil
}

type Transaction struct {
	ID            string     `json:"id" db:"id"`
	AppID         string     `json:"app_id" db:"app_id"`
	AppName       string     `json:"app_name,omitempty" db:"app_name"`
	OrderID       string     `json:"order_id" db:"order_id"`
	Amount        float64    `json:"amount" db:"amount"`
	UniqueCode    int        `json:"unique_code" db:"unique_code"`
	TotalAmount   float64    `json:"total_amount" db:"total_amount"`
	Channel       string     `json:"channel" db:"channel"`
	Status        string     `json:"status" db:"status"`
	CustomerName  string     `json:"customer_name" db:"customer_name"`
	CustomerEmail string     `json:"customer_email" db:"customer_email"`
	CustomerPhone string     `json:"customer_phone" db:"customer_phone"`
	QRISPayload   string     `json:"qris_payload" db:"qris_payload"`
	Notes         string     `json:"notes" db:"notes"`
	Metadata      JSONRaw    `json:"metadata" db:"metadata"`
	RedirectURL   string     `json:"redirect_url" db:"redirect_url"`
	CheckoutURL   string     `json:"checkout_url,omitempty"`
	ExpiredAt     time.Time  `json:"expired_at" db:"expired_at"`
	PaidAt        *time.Time `json:"paid_at" db:"paid_at"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`

	// Bank info for checkout
	BankName          string `json:"bank_name,omitempty"`
	BankAccountNumber string `json:"bank_account_number,omitempty"`
	BankAccountName   string `json:"bank_account_name,omitempty"`
}

type Handler struct {
	db         *sqlx.DB
	rdb        *redis.Client
	cfg        *config.Config
	codeGen    *uniquecode.Generator
	dispatcher *webhook.Dispatcher
}

func NewHandler(db *sqlx.DB, rdb *redis.Client, cfg *config.Config, codeGen *uniquecode.Generator, dispatcher *webhook.Dispatcher) *Handler {
	h := &Handler{
		db:         db,
		rdb:        rdb,
		cfg:        cfg,
		codeGen:    codeGen,
		dispatcher: dispatcher,
	}

	// Start background expiry sweep
	go h.startExpiryWorker()

	return h
}

type CreatePaymentRequest struct {
	OrderID       string                 `json:"order_id" binding:"required"`
	Amount        float64                `json:"amount" binding:"required,gt=0"`
	CustomerName  string                 `json:"customer_name"`
	CustomerEmail string                 `json:"customer_email"`
	CustomerPhone string                 `json:"customer_phone"`
	Notes         string                 `json:"notes"`
	Metadata      map[string]interface{} `json:"metadata"` // Dynamic PMB & custom fields
	RedirectURL   string                 `json:"redirect_url"`
	ExpiryMinutes int                    `json:"expiry_minutes"` // Default 30 mins
}

// CreatePayment handles POST /v1/payments (Protected by API Key)
func (h *Handler) CreatePayment(c *gin.Context) {
	appID := c.GetString("app_id")
	if appID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	expiryDuration := 30 * time.Minute
	if req.ExpiryMinutes > 0 && req.ExpiryMinutes <= 1440 {
		expiryDuration = time.Duration(req.ExpiryMinutes) * time.Minute
	}

	// 1. Allocate unique code with strict collision handling
	baseAmountInt := int64(req.Amount)
	code, err := h.codeGen.AllocateUniqueCode(c.Request.Context(), baseAmountInt, expiryDuration)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Traffic pembayaran sedang padat untuk nominal ini. Silakan coba kembali dalam 1 menit.",
		})
		return
	}

	totalAmount := req.Amount + float64(code)
	totalAmountInt := int64(totalAmount)

	// 2. Fetch Master QRIS string from merchant/config
	var masterQRIS string
	_ = h.db.Get(&masterQRIS, "SELECT master_qris FROM merchants WHERE master_qris != '' LIMIT 1")
	if masterQRIS == "" {
		masterQRIS = h.cfg.DefaultMasterQRIS
	}

	// 3. Generate Injected Dynamic QRIS
	qrisPayload, err := qris.GenerateDynamicQRIS(masterQRIS, totalAmountInt)
	if err != nil {
		log.Printf("[Payment] QRIS generation fallback: %v", err)
		qrisPayload = masterQRIS
	}

	// Prepare metadata JSON
	metadataBytes, _ := json.Marshal(req.Metadata)
	if len(metadataBytes) == 0 || string(metadataBytes) == "null" {
		metadataBytes = []byte("{}")
	}

	txID := uuid.New().String()
	expiredAt := time.Now().Add(expiryDuration)

	insertQuery := h.db.Rebind(`
		INSERT INTO transactions (
			id, app_id, order_id, amount, unique_code, total_amount, channel,
			status, customer_name, customer_email, customer_phone, qris_payload,
			notes, metadata, redirect_url, expired_at
		) VALUES (
			?, ?, ?, ?, ?, ?, 'QRIS',
			'PENDING', ?, ?, ?, ?,
			?, ?, ?, ?
		)
	`)

	_, err = h.db.Exec(insertQuery,
		txID, appID, req.OrderID, req.Amount, code, totalAmount,
		req.CustomerName, req.CustomerEmail, req.CustomerPhone, qrisPayload,
		req.Notes, string(metadataBytes), req.RedirectURL, expiredAt,
	)

	if err != nil {
		_ = h.codeGen.ReleaseUniqueCode(c.Request.Context(), baseAmountInt, code)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction: " + err.Error()})
		return
	}

	var tx Transaction
	selectQuery := h.db.Rebind(`
		SELECT t.*, a.name as app_name 
		FROM transactions t
		JOIN apps a ON t.app_id = a.id
		WHERE t.id = ? LIMIT 1
	`)
	err = h.db.Get(&tx, selectQuery, txID)
	if err != nil {
		log.Printf("[Payment] Select transaction warning: %v", err)
		tx.ID = txID
		tx.AppID = appID
		tx.OrderID = req.OrderID
		tx.Amount = req.Amount
		tx.UniqueCode = code
		tx.TotalAmount = totalAmount
		tx.Channel = "QRIS"
		tx.Status = "PENDING"
		tx.CustomerName = req.CustomerName
		tx.CustomerEmail = req.CustomerEmail
		tx.CustomerPhone = req.CustomerPhone
		tx.QRISPayload = qrisPayload
		tx.Notes = req.Notes
		tx.Metadata = metadataBytes
		tx.RedirectURL = req.RedirectURL
		tx.ExpiredAt = expiredAt
		tx.CreatedAt = time.Now()
		tx.UpdatedAt = time.Now()
	}

	tx.CheckoutURL = fmt.Sprintf("%s/pay/%s", h.cfg.DashboardURL, tx.ID)

	c.JSON(http.StatusCreated, tx)
}

// GetPayment handles GET /v1/payments/:id (Public Checkout Info)
func (h *Handler) GetPayment(c *gin.Context) {
	id := c.Param("id")

	query := h.db.Rebind(`
		SELECT t.*, a.name as app_name 
		FROM transactions t
		JOIN apps a ON t.app_id = a.id
		WHERE t.id = ? LIMIT 1
	`)
	var tx Transaction
	err := h.db.Get(&tx, query, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
		return
	}

	// Auto check expiry on read
	if tx.Status == "PENDING" && time.Now().After(tx.ExpiredAt) {
		tx.Status = "EXPIRED"
		updateExpiryQuery := h.db.Rebind("UPDATE transactions SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
		_, _ = h.db.Exec(updateExpiryQuery, tx.ID)
		_ = h.codeGen.ReleaseUniqueCode(c.Request.Context(), int64(tx.Amount), tx.UniqueCode)
	}

	// Attach merchant bank details
	var merchant struct {
		BankName          string `db:"bank_name"`
		BankAccountNumber string `db:"bank_account_number"`
		BankAccountName   string `db:"bank_account_name"`
	}
	_ = h.db.Get(&merchant, "SELECT bank_name, bank_account_number, bank_account_name FROM merchants WHERE bank_account_number != '' LIMIT 1")

	if merchant.BankAccountNumber != "" {
		tx.BankName = merchant.BankName
		tx.BankAccountNumber = merchant.BankAccountNumber
		tx.BankAccountName = merchant.BankAccountName
	} else {
		tx.BankName = h.cfg.DefaultBankName
		tx.BankAccountNumber = h.cfg.DefaultBankAccount
		tx.BankAccountName = h.cfg.DefaultBankHolder
	}

	tx.CheckoutURL = fmt.Sprintf("%s/pay/%s", h.cfg.DashboardURL, tx.ID)
	c.JSON(http.StatusOK, tx)
}

// PaymentStatusSSE handles GET /v1/payments/:id/stream (Server-Sent Events for checkout page)
func (h *Handler) PaymentStatusSSE(c *gin.Context) {
	id := c.Param("id")

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	channelName := fmt.Sprintf("payment_status:%s", id)
	msgChan := h.rdb.SubscribeChannel(c.Request.Context(), channelName)

	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	// Initial status push
	var status string
	statusQuery := h.db.Rebind("SELECT status FROM transactions WHERE id = ?")
	_ = h.db.Get(&status, statusQuery, id)
	c.SSEvent("status", gin.H{"id": id, "status": status})
	c.Writer.Flush()

	if status == "PAID" || status == "EXPIRED" {
		return
	}

	c.Stream(func(w io.Writer) bool {
		select {
		case <-c.Request.Context().Done():
			return false
		case msg, ok := <-msgChan:
			if !ok {
				return false
			}
			c.SSEvent("status", gin.H{"id": id, "status": msg})
			w.(http.Flusher).Flush()
			if msg == "PAID" || msg == "EXPIRED" {
				return false
			}
			return true
		case <-ticker.C:
			// Polling DB fallback
			var currentStatus string
			err := h.db.Get(&currentStatus, statusQuery, id)
			if err == nil {
				c.SSEvent("status", gin.H{"id": id, "status": currentStatus})
				w.(http.Flusher).Flush()
				if currentStatus == "PAID" || currentStatus == "EXPIRED" {
					return false
				}
			}
			return true
		}
	})
}

// Background worker to expire old transactions
func (h *Handler) startExpiryWorker() {
	ticker := time.NewTicker(1 * time.Minute)
	for range ticker.C {
		var expiredTxs []struct {
			ID         string  `db:"id"`
			Amount     float64 `db:"amount"`
			UniqueCode int     `db:"unique_code"`
		}

		selectQuery := h.db.Rebind(`
			SELECT id, amount, unique_code 
			FROM transactions 
			WHERE status = 'PENDING' AND expired_at < CURRENT_TIMESTAMP
		`)
		err := h.db.Select(&expiredTxs, selectQuery)
		if err == nil && len(expiredTxs) > 0 {
			ctx := context.Background()
			for _, tx := range expiredTxs {
				updateQuery := h.db.Rebind(`
					UPDATE transactions 
					SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP 
					WHERE id = ? AND status = 'PENDING'
				`)
				res, _ := h.db.Exec(updateQuery, tx.ID)
				if rows, _ := res.RowsAffected(); rows > 0 {
					_ = h.codeGen.ReleaseUniqueCode(ctx, int64(tx.Amount), tx.UniqueCode)
					_ = h.rdb.Publish(ctx, fmt.Sprintf("payment_status:%s", tx.ID), "EXPIRED")
					log.Printf("[Payment] Auto-expired transaction %s", tx.ID)
				}
			}
		}
	}
}
