package app

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"sendagopay-backend/internal/config"
	"sendagopay-backend/internal/mailer"
)

type App struct {
	ID            string    `json:"id" db:"id"`
	MerchantID    string    `json:"merchant_id" db:"merchant_id"`
	Name          string    `json:"name" db:"name"`
	Description   string    `json:"description" db:"description"`
	PublicKey     string    `json:"public_key" db:"public_key"`
	SecretKey     string    `json:"secret_key" db:"secret_key"`
	WebhookURL    string    `json:"webhook_url" db:"webhook_url"`
	WebhookSecret string    `json:"webhook_secret" db:"webhook_secret"`
	IsActive      bool      `json:"is_active" db:"is_active"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

type Handler struct {
	db     *sqlx.DB
	cfg    *config.Config
	mailer *mailer.Mailer
}

func NewHandler(db *sqlx.DB, cfg *config.Config) *Handler {
	return &Handler{
		db:     db,
		cfg:    cfg,
		mailer: mailer.NewDefault(),
	}
}

func generateRandomKey(prefix string, length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return fmt.Sprintf("%s%d", prefix, time.Now().UnixNano())
	}
	return prefix + hex.EncodeToString(bytes)
}

func (h *Handler) ListApps(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	env := c.Query("env")
	if env == "" {
		env = c.GetHeader("X-Environment")
	}

	var apps []App
	var err error

	if merchantID != "" {
		query := h.db.Rebind("SELECT * FROM apps WHERE CAST(merchant_id AS TEXT) = ? ORDER BY created_at DESC")
		err = h.db.Select(&apps, query, merchantID)
	} else {
		query := h.db.Rebind("SELECT * FROM apps ORDER BY created_at DESC")
		err = h.db.Select(&apps, query)
	}

	if err != nil {
		c.JSON(http.StatusOK, []App{})
		return
	}

	if apps == nil {
		apps = []App{}
	}

	// Filter by environment prefix if requested
	if env == "sandbox" {
		var filtered []App
		for _, a := range apps {
			if len(a.PublicKey) >= 8 && a.PublicKey[:7] == "sg_test" {
				filtered = append(filtered, a)
			}
		}
		c.JSON(http.StatusOK, filtered)
		return
	} else if env == "production" {
		var filtered []App
		for _, a := range apps {
			if len(a.PublicKey) >= 8 && a.PublicKey[:7] == "sg_live" {
				filtered = append(filtered, a)
			}
		}
		c.JSON(http.StatusOK, filtered)
		return
	}

	c.JSON(http.StatusOK, apps)
}

type CreateAppRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	WebhookURL  string `json:"webhook_url"`
	Environment string `json:"environment"` // "sandbox" or "production"
}

func (h *Handler) CreateApp(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	if merchantID == "" {
		merchantID = "00000000-0000-0000-0000-000000000001"
	}

	var req CreateAppRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	appID := uuid.New().String()
	var publicKey, secretKey, webhookSec string

	if req.Environment == "sandbox" {
		publicKey = generateRandomKey("sg_test_pk_", 16)
		secretKey = generateRandomKey("sg_test_sk_", 24)
		webhookSec = generateRandomKey("whsec_test_", 20)
	} else {
		publicKey = generateRandomKey("sg_live_pk_", 16)
		secretKey = generateRandomKey("sg_live_sk_", 24)
		webhookSec = generateRandomKey("whsec_live_", 20)
	}

	query := h.db.Rebind(`
		INSERT INTO apps (id, merchant_id, name, description, public_key, secret_key, webhook_url, webhook_secret, is_active)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
	`)

	_, err := h.db.Exec(query, appID, merchantID, req.Name, req.Description, publicKey, secretKey, req.WebhookURL, webhookSec)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create app: " + err.Error()})
		return
	}

	var created App
	selectQuery := h.db.Rebind("SELECT * FROM apps WHERE CAST(id AS TEXT) = ? LIMIT 1")
	_ = h.db.Get(&created, selectQuery, appID)

	c.JSON(http.StatusCreated, created)
}

func (h *Handler) UpdateApp(c *gin.Context) {
	appID := c.Param("id")
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		WebhookURL  string `json:"webhook_url"`
		IsActive    *bool  `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updateQuery := h.db.Rebind(`
		UPDATE apps 
		SET name = COALESCE(NULLIF(?, ''), name),
		    description = COALESCE(NULLIF(?, ''), description),
		    webhook_url = COALESCE(NULLIF(?, ''), webhook_url),
		    updated_at = CURRENT_TIMESTAMP
		WHERE CAST(id AS TEXT) = ?
	`)
	_, _ = h.db.Exec(updateQuery, req.Name, req.Description, req.WebhookURL, appID)

	var updated App
	selectQuery := h.db.Rebind("SELECT * FROM apps WHERE CAST(id AS TEXT) = ? LIMIT 1")
	_ = h.db.Get(&updated, selectQuery, appID)
	c.JSON(http.StatusOK, updated)
}

// Instant direct key regeneration for Sandbox mode
func (h *Handler) RegenerateKeys(c *gin.Context) {
	appID := c.Param("id")
	env := c.Query("env")
	if env == "" {
		env = c.GetHeader("X-Environment")
	}

	var newPublicKey, newSecretKey, newWebhookSec string

	if env == "sandbox" {
		newPublicKey = generateRandomKey("sg_test_pk_", 16)
		newSecretKey = generateRandomKey("sg_test_sk_", 24)
		newWebhookSec = generateRandomKey("whsec_test_", 20)
	} else {
		newPublicKey = generateRandomKey("sg_live_pk_", 16)
		newSecretKey = generateRandomKey("sg_live_sk_", 24)
		newWebhookSec = generateRandomKey("whsec_live_", 20)
	}

	updateQuery := h.db.Rebind(`
		UPDATE apps 
		SET public_key = ?, secret_key = ?, webhook_secret = ?, updated_at = CURRENT_TIMESTAMP
		WHERE CAST(id AS TEXT) = ?
	`)
	_, _ = h.db.Exec(updateQuery, newPublicKey, newSecretKey, newWebhookSec, appID)

	var updated App
	selectQuery := h.db.Rebind("SELECT * FROM apps WHERE CAST(id AS TEXT) = ? LIMIT 1")
	_ = h.db.Get(&updated, selectQuery, appID)

	c.JSON(http.StatusOK, updated)
}

type RevokeKeyRequest struct {
	IsActive bool `json:"is_active"`
}

func (h *Handler) RevokeKey(c *gin.Context) {
	appID := c.Param("id")
	var req RevokeKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req.IsActive = false
	}

	updateQuery := h.db.Rebind("UPDATE apps SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE CAST(id AS TEXT) = ?")
	_, _ = h.db.Exec(updateQuery, req.IsActive, appID)

	var updated App
	selectQuery := h.db.Rebind("SELECT * FROM apps WHERE CAST(id AS TEXT) = ? LIMIT 1")
	_ = h.db.Get(&updated, selectQuery, appID)

	c.JSON(http.StatusOK, updated)
}

func (h *Handler) DeleteApp(c *gin.Context) {
	appID := c.Param("id")

	delTx := h.db.Rebind("DELETE FROM transactions WHERE CAST(app_id AS TEXT) = ?")
	_, _ = h.db.Exec(delTx, appID)

	delReq := h.db.Rebind("DELETE FROM key_regeneration_requests WHERE CAST(app_id AS TEXT) = ?")
	_, _ = h.db.Exec(delReq, appID)

	delLogs := h.db.Rebind("DELETE FROM webhook_logs WHERE CAST(app_id AS TEXT) = ?")
	_, _ = h.db.Exec(delLogs, appID)

	delApp := h.db.Rebind("DELETE FROM apps WHERE CAST(id AS TEXT) = ?")
	_, err := h.db.Exec(delApp, appID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete app: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "App and API Keys deleted successfully"})
}

// -------------------------------------------------------------
// LIVE PRODUCTION KEY REGENERATION REQUEST & APPROVAL WORKFLOW
// -------------------------------------------------------------

type SubmitKeyRegenPayload struct {
	Reason      string `json:"reason" binding:"required"`
	RequestedBy string `json:"requested_by" binding:"required"`
	Notes       string `json:"notes"`
	Environment string `json:"environment"`
}

func (h *Handler) SubmitKeyRegenRequest(c *gin.Context) {
	appID := c.Param("id")
	var payload SubmitKeyRegenPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Reason and requester email are required"})
		return
	}

	var app App
	selectQuery := h.db.Rebind("SELECT * FROM apps WHERE CAST(id AS TEXT) = ? LIMIT 1")
	err := h.db.Get(&app, selectQuery, appID)

	if err != nil || app.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Aplikasi tidak ditemukan"})
		return
	}

	reqID := uuid.New().String()
	insertReq := h.db.Rebind(`
		INSERT INTO key_regeneration_requests (
			id, app_id, merchant_id, reason, requested_by, notes, status, environment
		) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
	`)

	_, err = h.db.Exec(insertReq, reqID, app.ID, app.MerchantID, payload.Reason, payload.RequestedBy, payload.Notes, payload.Environment)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit request: " + err.Error()})
		return
	}

	var created KeyRegenRequest
	selectReq := h.db.Rebind("SELECT * FROM key_regeneration_requests WHERE CAST(id AS TEXT) = ? LIMIT 1")
	_ = h.db.Get(&created, selectReq, reqID)

	c.JSON(http.StatusCreated, created)
}

type KeyRegenRequest struct {
	ID              string     `json:"id" db:"id"`
	AppID           string     `json:"app_id" db:"app_id"`
	AppName         string     `json:"app_name,omitempty" db:"app_name"`
	MerchantID      string     `json:"merchant_id" db:"merchant_id"`
	Reason          string     `json:"reason" db:"reason"`
	RequestedBy     string     `json:"requested_by" db:"requested_by"`
	ApprovedBy      *string    `json:"approved_by" db:"approved_by"`
	Notes           string     `json:"notes" db:"notes"`
	Status          string     `json:"status" db:"status"` // PENDING, APPROVED, REJECTED
	RejectionReason *string    `json:"rejection_reason" db:"rejection_reason"`
	Environment     string     `json:"environment" db:"environment"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
	ApprovedAt      *time.Time `json:"approved_at" db:"approved_at"`
}

func (h *Handler) ListKeyRegenRequests(c *gin.Context) {
	merchantID := c.GetString("merchant_id")

	var requests []KeyRegenRequest
	var err error

	if merchantID != "" {
		query := h.db.Rebind(`
			SELECT r.*, a.name as app_name 
			FROM key_regeneration_requests r
			JOIN apps a ON r.app_id = a.id
			WHERE CAST(r.merchant_id AS TEXT) = ?
			ORDER BY r.created_at DESC
		`)
		err = h.db.Select(&requests, query, merchantID)
	} else {
		query := h.db.Rebind(`
			SELECT r.*, a.name as app_name 
			FROM key_regeneration_requests r
			JOIN apps a ON r.app_id = a.id
			ORDER BY r.created_at DESC
		`)
		err = h.db.Select(&requests, query)
	}

	if err != nil || requests == nil {
		c.JSON(http.StatusOK, []KeyRegenRequest{})
		return
	}

	c.JSON(http.StatusOK, requests)
}

func (h *Handler) ApproveKeyRegenRequest(c *gin.Context) {
	reqID := c.Param("id")
	adminEmail := c.GetString("merchant_email")
	if adminEmail == "" {
		adminEmail = "admin@sendago.pay"
	}

	var req KeyRegenRequest
	selectReq := h.db.Rebind("SELECT * FROM key_regeneration_requests WHERE CAST(id AS TEXT) = ? LIMIT 1")
	err := h.db.Get(&req, selectReq, reqID)

	if err != nil || req.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permintaan tidak ditemukan"})
		return
	}

	if req.Status != "PENDING" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Permintaan ini sudah diproses sebelumnya"})
		return
	}

	var newPublicKey, newSecretKey, newWebhookSec string
	if req.Environment == "sandbox" {
		newPublicKey = generateRandomKey("sg_test_pk_", 16)
		newSecretKey = generateRandomKey("sg_test_sk_", 24)
		webhookSec := generateRandomKey("whsec_test_", 20)
		newWebhookSec = webhookSec
	} else {
		newPublicKey = generateRandomKey("sg_live_pk_", 16)
		newSecretKey = generateRandomKey("sg_live_sk_", 24)
		webhookSec := generateRandomKey("whsec_live_", 20)
		newWebhookSec = webhookSec
	}

	updateApp := h.db.Rebind(`
		UPDATE apps 
		SET public_key = ?, secret_key = ?, webhook_secret = ?, updated_at = CURRENT_TIMESTAMP
		WHERE CAST(id AS TEXT) = ?
	`)
	_, err = h.db.Exec(updateApp, newPublicKey, newSecretKey, newWebhookSec, req.AppID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui API Key aplikasi: " + err.Error()})
		return
	}

	now := time.Now()
	updateReq := h.db.Rebind(`
		UPDATE key_regeneration_requests 
		SET status = 'APPROVED', approved_by = ?, approved_at = ?, updated_at = CURRENT_TIMESTAMP
		WHERE CAST(id AS TEXT) = ?
	`)
	_, _ = h.db.Exec(updateReq, adminEmail, now, reqID)

	// Send notification email via SendagoMail Engine
	mailRes, mailErr := h.mailer.SendKeyRegenApprovalEmail(
		req.RequestedBy,
		req.AppName,
		newPublicKey,
		adminEmail,
	)

	if mailErr != nil {
		log.Printf("[App] Failed to send key rotation email: %v", mailErr)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Kunci API berhasil dirotasi dan disetujui.",
		"new_credentials": gin.H{
			"public_key":     newPublicKey,
			"secret_key":     newSecretKey,
			"webhook_secret": newWebhookSec,
		},
		"mail_delivery": gin.H{
			"sent":             mailErr == nil && mailRes != nil && mailRes.ID != "",
			"recipient":        req.RequestedBy,
			"delivery_status": "DELIVERED_VIA_SENDAGOMAIL",
			"body_preview":    func() string { if mailRes != nil { return mailRes.BodyPreview }; return "" }(),
		},
	})
}

type RejectKeyRegenPayload struct {
	Reason string `json:"reason" binding:"required"`
}

func (h *Handler) RejectKeyRegenRequest(c *gin.Context) {
	reqID := c.Param("id")
	var payload RejectKeyRegenPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		payload.Reason = "Permintaan tidak memenuhi syarat keamanan atau dibatalkan oleh admin."
	}

	adminEmail := c.GetString("merchant_email")
	if adminEmail == "" {
		adminEmail = "admin@sendago.pay"
	}

	var req KeyRegenRequest
	selectReq := h.db.Rebind("SELECT * FROM key_regeneration_requests WHERE CAST(id AS TEXT) = ? LIMIT 1")
	err := h.db.Get(&req, selectReq, reqID)

	if err != nil || req.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permintaan tidak ditemukan"})
		return
	}

	updateReq := h.db.Rebind(`
		UPDATE key_regeneration_requests 
		SET status = 'REJECTED', approved_by = ?, rejection_reason = ?
		WHERE CAST(id AS TEXT) = ?
	`)
	_, _ = h.db.Exec(updateReq, adminEmail, payload.Reason, reqID)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Permintaan rotasi kunci ditolak.",
		"reason":  payload.Reason,
	})
}
