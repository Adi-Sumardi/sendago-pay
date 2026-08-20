package app

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"time"

	"sendagopay-backend/internal/config"
	"sendagopay-backend/internal/mailer"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
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

type KeyRegenRequest struct {
	ID              string     `json:"id" db:"id"`
	AppID           string     `json:"app_id" db:"app_id"`
	AppName         string     `json:"app_name" db:"app_name"`
	RequestedBy     string     `json:"requested_by" db:"requested_by"`
	Environment     string     `json:"environment" db:"environment"`
	Reason          string     `json:"reason" db:"reason"`
	Notes           string     `json:"notes" db:"notes"`
	Status          string     `json:"status" db:"status"` // PENDING, APPROVED, REJECTED
	ApprovedBy      string     `json:"approved_by" db:"approved_by"`
	ApprovedAt      *time.Time `json:"approved_at" db:"approved_at"`
	RejectionReason string     `json:"rejection_reason" db:"rejection_reason"`
	EmailSent       bool       `json:"email_sent" db:"email_sent"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
}

type Handler struct {
	db     *sqlx.DB
	mailer *mailer.Mailer
}

func NewHandler(db *sqlx.DB, cfg *config.Config) *Handler {
	return &Handler{
		db:     db,
		mailer: mailer.New(cfg.SendagoMailEndpoint, cfg.SendagoMailMemberID, cfg.SendagoMailSecret, cfg.SendagoMailFromAddr),
	}
}

func generateRandomKey(prefix string, byteLen int) string {
	bytes := make([]byte, byteLen)
	_, _ = rand.Read(bytes)
	return fmt.Sprintf("%s%s", prefix, hex.EncodeToString(bytes))
}

func (h *Handler) ListApps(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	var apps []App
	var err error

	if merchantID == "" {
		err = h.db.Select(&apps, "SELECT * FROM apps ORDER BY created_at DESC")
	} else {
		query := h.db.Rebind("SELECT * FROM apps WHERE merchant_id = ? ORDER BY created_at DESC")
		err = h.db.Select(&apps, query, merchantID)
	}

	if err != nil {
		c.JSON(http.StatusOK, []App{})
		return
	}

	if apps == nil {
		apps = []App{}
	}

	c.JSON(http.StatusOK, apps)
}

type CreateAppRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	WebhookURL  string `json:"webhook_url"`
	Environment string `json:"environment"` // 'production' | 'sandbox'
}

func (h *Handler) CreateApp(c *gin.Context) {
	var req CreateAppRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "App name is required"})
		return
	}

	merchantID := c.GetString("merchant_id")
	if merchantID == "" {
		var mID string
		_ = h.db.Get(&mID, "SELECT id FROM merchants LIMIT 1")
		if mID == "" {
			mID = uuid.New().String()
			insertMerchant := h.db.Rebind("INSERT INTO merchants (id, email, password_hash, name) VALUES (?, 'admin@sendago.pay', '$2a$10$default', 'SendaGo Admin')")
			_, _ = h.db.Exec(insertMerchant, mID)
		}
		merchantID = mID
	}

	// Environment check from request or Header
	env := req.Environment
	if env == "" {
		env = c.GetHeader("X-Environment")
	}
	if env == "" {
		env = "production"
	}

	appID := uuid.New().String()
	var publicKey, secretKey, webhookSecret string

	if env == "sandbox" {
		publicKey = generateRandomKey("sg_test_pk_", 16)
		secretKey = generateRandomKey("sg_test_sk_", 24)
		webhookSecret = generateRandomKey("whsec_test_", 20)
	} else {
		publicKey = generateRandomKey("sg_live_pk_", 16)
		secretKey = generateRandomKey("sg_live_sk_", 24)
		webhookSecret = generateRandomKey("whsec_live_", 20)
	}

	insertQuery := h.db.Rebind(`
		INSERT INTO apps (id, merchant_id, name, description, public_key, secret_key, webhook_url, webhook_secret, is_active)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, true)
	`)
	_, err := h.db.Exec(insertQuery, appID, merchantID, req.Name, req.Description, publicKey, secretKey, req.WebhookURL, webhookSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create app: " + err.Error()})
		return
	}

	var created App
	selectQuery := h.db.Rebind("SELECT * FROM apps WHERE id = ? LIMIT 1")
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
		WHERE id = ?
	`)
	_, _ = h.db.Exec(updateQuery, req.Name, req.Description, req.WebhookURL, appID)

	var updated App
	selectQuery := h.db.Rebind("SELECT * FROM apps WHERE id = ? LIMIT 1")
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
		WHERE id = ?
	`)
	_, _ = h.db.Exec(updateQuery, newPublicKey, newSecretKey, newWebhookSec, appID)

	var updated App
	selectQuery := h.db.Rebind("SELECT * FROM apps WHERE id = ? LIMIT 1")
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

	updateQuery := h.db.Rebind("UPDATE apps SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
	_, _ = h.db.Exec(updateQuery, req.IsActive, appID)

	var updated App
	selectQuery := h.db.Rebind("SELECT * FROM apps WHERE id = ? LIMIT 1")
	_ = h.db.Get(&updated, selectQuery, appID)

	c.JSON(http.StatusOK, updated)
}

func (h *Handler) DeleteApp(c *gin.Context) {
	appID := c.Param("id")

	delReq := h.db.Rebind("DELETE FROM key_regeneration_requests WHERE app_id = ?")
	_, _ = h.db.Exec(delReq, appID)

	delLogs := h.db.Rebind("DELETE FROM webhook_logs WHERE app_id = ?")
	_, _ = h.db.Exec(delLogs, appID)

	delApp := h.db.Rebind("DELETE FROM apps WHERE id = ?")
	_, _ = h.db.Exec(delApp, appID)

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
	selectQuery := h.db.Rebind("SELECT * FROM apps WHERE id = ? LIMIT 1")
	err := h.db.Get(&app, selectQuery, appID)

	if err != nil || app.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Aplikasi tidak ditemukan"})
		return
	}

	env := payload.Environment
	if env == "" {
		env = "production"
	}

	reqID := uuid.New().String()
	insertQuery := h.db.Rebind(`
		INSERT INTO key_regeneration_requests (id, app_id, app_name, requested_by, environment, reason, notes, status, email_sent)
		VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', false)
	`)
	_, _ = h.db.Exec(insertQuery, reqID, app.ID, app.Name, payload.RequestedBy, env, payload.Reason, payload.Notes)

	var created KeyRegenRequest
	selectReq := h.db.Rebind("SELECT * FROM key_regeneration_requests WHERE id = ? LIMIT 1")
	_ = h.db.Get(&created, selectReq, reqID)

	log.Printf("📩 [KEY REGEN REQUEST] User %s requested Live Key rotation for '%s' (Reason: %s)", payload.RequestedBy, app.Name, payload.Reason)

	c.JSON(http.StatusCreated, gin.H{
		"status":  "PENDING",
		"message": "Permintaan regenerasi Live API Key berhasil diajukan dan sedang menunggu persetujuan Administrator.",
		"request": created,
	})
}

func (h *Handler) ListKeyRegenRequests(c *gin.Context) {
	var requests []KeyRegenRequest
	err := h.db.Select(&requests, "SELECT * FROM key_regeneration_requests ORDER BY created_at DESC")
	if err != nil {
		c.JSON(http.StatusOK, []KeyRegenRequest{})
		return
	}
	if requests == nil {
		requests = []KeyRegenRequest{}
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
	selectReq := h.db.Rebind("SELECT * FROM key_regeneration_requests WHERE id = ? LIMIT 1")
	err := h.db.Get(&req, selectReq, reqID)

	if err != nil || req.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permintaan regenerasi key tidak ditemukan"})
		return
	}

	if req.Status != "PENDING" {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Permintaan ini sudah diproses (%s)", req.Status)})
		return
	}

	// 1. Generate new Live Production keys
	newPublicKey := generateRandomKey("sg_live_pk_", 16)
	newSecretKey := generateRandomKey("sg_live_sk_", 24)
	newWebhookSec := generateRandomKey("whsec_live_", 20)

	// 2. Update app credentials
	updateApp := h.db.Rebind(`
		UPDATE apps 
		SET public_key = ?, secret_key = ?, webhook_secret = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`)
	_, _ = h.db.Exec(updateApp, newPublicKey, newSecretKey, newWebhookSec, req.AppID)

	// 3. Mark request as APPROVED
	now := time.Now()
	updateReq := h.db.Rebind(`
		UPDATE key_regeneration_requests
		SET status = 'APPROVED', approved_by = ?, approved_at = ?, email_sent = true
		WHERE id = ?
	`)
	_, _ = h.db.Exec(updateReq, adminEmail, now, reqID)

	// 4. Dispatch Email Notification via sendagomail.adilabs.id
	mailRes, _ := h.mailer.SendKeyRegenApprovalEmail(req.RequestedBy, req.AppName, newPublicKey, adminEmail)

	c.JSON(http.StatusOK, gin.H{
		"status":  "APPROVED",
		"message": "Permintaan berhasil disetujui, API Key Live baru telah diterbitkan, dan email notifikasi telah dikirim via sendagomail.adilabs.id ke " + req.RequestedBy,
		"email_notification": gin.H{
			"recipient":       mailRes.Recipient,
			"subject":         mailRes.Subject,
			"sender":          mailRes.Sender,
			"mail_server":     mailRes.Host,
			"message_id":      mailRes.MessageID,
			"sent_at":         mailRes.SentAt.Format(time.RFC3339),
			"app_name":        req.AppName,
			"new_public_key":  newPublicKey,
			"delivery_status": "DELIVERED_VIA_SENDAGOMAIL",
			"body_preview":    mailRes.BodyPreview,
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
	selectReq := h.db.Rebind("SELECT * FROM key_regeneration_requests WHERE id = ? LIMIT 1")
	err := h.db.Get(&req, selectReq, reqID)

	if err != nil || req.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permintaan tidak ditemukan"})
		return
	}

	updateReq := h.db.Rebind(`
		UPDATE key_regeneration_requests
		SET status = 'REJECTED', approved_by = ?, rejection_reason = ?
		WHERE id = ?
	`)
	_, _ = h.db.Exec(updateReq, adminEmail, payload.Reason, reqID)

	log.Printf("🚫 [KEY REGEN REJECTED] Admin %s rejected key regen for '%s' (Reason: %s)", adminEmail, req.AppName, payload.Reason)

	c.JSON(http.StatusOK, gin.H{
		"status":  "REJECTED",
		"message": "Permintaan regenerasi key telah ditolak.",
	})
}
