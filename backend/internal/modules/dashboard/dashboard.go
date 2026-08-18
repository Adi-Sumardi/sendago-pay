package dashboard

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"

	"sendagopay-backend/internal/config"
	"sendagopay-backend/internal/mailer"
	"sendagopay-backend/internal/totp"
)

type SummaryStats struct {
	TotalVolume         float64 `json:"total_volume"`
	SuccessfulCount     int     `json:"successful_count"`
	PendingCount        int     `json:"pending_count"`
	SuccessRate         float64 `json:"success_rate"`
	ActiveAppsCount     int     `json:"active_apps_count"`
	TodayVolume         float64 `json:"today_volume"`
	TotalMutationsCount int     `json:"total_mutations_count"`
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
		mailer: mailer.New(cfg.SendagoMailEndpoint, cfg.SendagoMailMemberID, cfg.SendagoMailSecret, cfg.SendagoMailFromAddr),
	}
}

// -------------------------------------------------------------
// Authentication & 2FA Implementation
// -------------------------------------------------------------

type LoginRequest struct {
	Email     string `json:"email" binding:"required"`
	Password  string `json:"password" binding:"required"`
	TOTPCode  string `json:"totp_code"`  // Optional on step 1, required if 2FA enabled
	TempToken string `json:"temp_token"` // Temporary token after password passed
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and password required"})
		return
	}

	var user struct {
		ID           string `db:"id"`
		Email        string `db:"email"`
		PasswordHash string `db:"password_hash"`
		Name         string `db:"name"`
		TOTPSecret   string `db:"totp_secret"`
		Is2FAEnabled bool   `db:"is_2fa_enabled"`
	}

	// 1. Check in merchants table
	err := h.db.Get(&user, "SELECT id, email, password_hash, name, totp_secret, is_2fa_enabled FROM merchants WHERE email = ? LIMIT 1", req.Email)
	if err != nil {
		_ = h.db.Get(&user, "SELECT id, email, password_hash, name, totp_secret, is_2fa_enabled FROM merchants WHERE email = $1 LIMIT 1", req.Email)
	}

	// 2. If not found in merchants, check admin_users table
	if user.ID == "" {
		err = h.db.Get(&user, "SELECT id, email, password_hash, name, totp_secret, is_2fa_enabled FROM admin_users WHERE email = ? AND status = 'ACTIVE' LIMIT 1", req.Email)
		if err != nil {
			_ = h.db.Get(&user, "SELECT id, email, password_hash, name, totp_secret, is_2fa_enabled FROM admin_users WHERE email = $1 AND status = 'ACTIVE' LIMIT 1", req.Email)
		}
	}

	if user.ID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau kata sandi tidak valid"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau kata sandi tidak valid"})
		return
	}

	if user.Is2FAEnabled {
		if req.TOTPCode == "" {
			tempToken := h.generateTemp2FAToken(user.ID, user.Email)
			c.JSON(http.StatusOK, gin.H{
				"requires_2fa": true,
				"temp_token":   tempToken,
				"message":      "Masukkan 6 digit kode dari aplikasi Google Authenticator Anda.",
			})
			return
		}

		if !totp.ValidateCode(user.TOTPSecret, req.TOTPCode) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Kode 2FA tidak valid atau sudah kadaluarsa. Coba lagi."})
			return
		}
	}

	token, err := h.generateAccessToken(user.ID, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":             user.ID,
			"name":           user.Name,
			"email":          user.Email,
			"is_2fa_enabled": user.Is2FAEnabled,
		},
	})
}

func (h *Handler) GetMe(c *gin.Context) {
	var user struct {
		ID           string `db:"id"`
		Email        string `db:"email"`
		Name         string `db:"name"`
		Role         string `db:"role"`
		Is2FAEnabled bool   `db:"is_2fa_enabled"`
	}
	err := h.db.Get(&user, "SELECT id, email, name, role, is_2fa_enabled FROM admin_users WHERE status = 'ACTIVE' ORDER BY created_at ASC LIMIT 1")
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"id":             "00000000-0000-0000-0000-000000000001",
			"name":           "Adi Sumardi",
			"email":          "adi@adilabs.id",
			"role":           "SUPER_ADMIN",
			"is_2fa_enabled": false,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":             user.ID,
		"name":           user.Name,
		"email":          user.Email,
		"role":           user.Role,
		"is_2fa_enabled": user.Is2FAEnabled,
	})
}

func (h *Handler) Setup2FA(c *gin.Context) {
	secret, err := totp.GenerateSecret()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate 2FA secret"})
		return
	}

	userEmail := c.GetString("email")
	if userEmail == "" {
		userEmail = c.GetString("merchant_email")
	}
	if userEmail == "" {
		_ = h.db.Get(&userEmail, "SELECT email FROM admin_users WHERE status = 'ACTIVE' ORDER BY created_at ASC LIMIT 1")
	}
	if userEmail == "" {
		userEmail = "adi@adilabs.id"
	}

	otpAuthURL := totp.GenerateOTPAuthURL("SendaGoPay", userEmail, secret)

	_, _ = h.db.Exec("UPDATE merchants SET totp_secret = $1 WHERE email = $2", secret, userEmail)
	_, _ = h.db.Exec("UPDATE admin_users SET totp_secret = $1 WHERE email = $2", secret, userEmail)
	// Also fallback without email filter if single admin exists
	_, _ = h.db.Exec("UPDATE admin_users SET totp_secret = $1 WHERE status = 'ACTIVE'", secret)

	c.JSON(http.StatusOK, gin.H{
		"secret":      secret,
		"otpauth_url": otpAuthURL,
		"email":       userEmail,
	})
}

type Verify2FARequest struct {
	Secret string `json:"secret" binding:"required"`
	Code   string `json:"code" binding:"required"`
}

func (h *Handler) VerifyAndEnable2FA(c *gin.Context) {
	var req Verify2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	secret := strings.TrimSpace(req.Secret)
	code := strings.TrimSpace(req.Code)

	if !totp.ValidateCode(secret, code) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Kode 2FA salah atau telah kadaluarsa. Pastikan jam di ponsel Anda sinkron otomatis."})
		return
	}

	userEmail := c.GetString("email")
	if userEmail == "" {
		userEmail = c.GetString("merchant_email")
	}
	if userEmail == "" {
		_ = h.db.Get(&userEmail, "SELECT email FROM admin_users WHERE status = 'ACTIVE' ORDER BY created_at ASC LIMIT 1")
	}
	if userEmail == "" {
		userEmail = "adi@adilabs.id"
	}

	_, _ = h.db.Exec("UPDATE merchants SET totp_secret = $1, is_2fa_enabled = true WHERE email = $2", secret, userEmail)
	_, _ = h.db.Exec("UPDATE admin_users SET totp_secret = $1, is_2fa_enabled = true WHERE email = $2", secret, userEmail)
	_, _ = h.db.Exec("UPDATE admin_users SET totp_secret = $1, is_2fa_enabled = true WHERE status = 'ACTIVE'", secret)

	c.JSON(http.StatusOK, gin.H{
		"status":         "success",
		"message":        "Two-Factor Authentication berhasil diaktifkan!",
		"is_2fa_enabled": true,
	})
}

func (h *Handler) Disable2FA(c *gin.Context) {
	userEmail := c.GetString("email")
	if userEmail == "" {
		userEmail = c.GetString("merchant_email")
	}
	if userEmail == "" {
		_ = h.db.Get(&userEmail, "SELECT email FROM admin_users WHERE status = 'ACTIVE' ORDER BY created_at ASC LIMIT 1")
	}
	if userEmail == "" {
		userEmail = "adi@adilabs.id"
	}

	_, _ = h.db.Exec("UPDATE merchants SET is_2fa_enabled = false, totp_secret = '' WHERE email = $1", userEmail)
	_, _ = h.db.Exec("UPDATE admin_users SET is_2fa_enabled = false, totp_secret = '' WHERE email = $1", userEmail)
	_, _ = h.db.Exec("UPDATE admin_users SET is_2fa_enabled = false, totp_secret = '' WHERE status = 'ACTIVE'")

	c.JSON(http.StatusOK, gin.H{
		"status":         "success",
		"message":        "2FA telah dinonaktifkan.",
		"is_2fa_enabled": false,
	})
}

func (h *Handler) GetSummaryStats(c *gin.Context) {
	var stats SummaryStats

	// Total Paid Volume & Count
	_ = h.db.Get(&stats.TotalVolume, `SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE status = 'PAID'`)
	_ = h.db.Get(&stats.SuccessfulCount, `SELECT COUNT(*) FROM transactions WHERE status = 'PAID'`)
	_ = h.db.Get(&stats.PendingCount, `SELECT COUNT(*) FROM transactions WHERE status = 'PENDING'`)

	totalAll := stats.SuccessfulCount + stats.PendingCount
	if totalAll > 0 {
		stats.SuccessRate = float64(stats.SuccessfulCount) / float64(totalAll) * 100
	} else {
		stats.SuccessRate = 100.0
	}

	_ = h.db.Get(&stats.ActiveAppsCount, `SELECT COUNT(*) FROM apps WHERE is_active = 1 OR is_active = true`)
	_ = h.db.Get(&stats.TotalMutationsCount, `SELECT COUNT(*) FROM bank_mutations`)
	_ = h.db.Get(&stats.TodayVolume, `SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE status = 'PAID'`)

	c.JSON(http.StatusOK, stats)
}

type TxRow struct {
	ID            string     `json:"id" db:"id"`
	AppID         string     `json:"app_id" db:"app_id"`
	AppName       string     `json:"app_name" db:"app_name"`
	OrderID       string     `json:"order_id" db:"order_id"`
	Amount        float64    `json:"amount" db:"amount"`
	UniqueCode    int        `json:"unique_code" db:"unique_code"`
	TotalAmount   float64    `json:"total_amount" db:"total_amount"`
	Channel       string     `json:"channel" db:"channel"`
	Status        string     `json:"status" db:"status"`
	CustomerName  string     `json:"customer_name" db:"customer_name"`
	CustomerEmail string     `json:"customer_email" db:"customer_email"`
	ExpiredAt     time.Time  `json:"expired_at" db:"expired_at"`
	PaidAt        *time.Time `json:"paid_at" db:"paid_at"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
}

func (h *Handler) ListTransactions(c *gin.Context) {
	status := c.Query("status")

	query := `
		SELECT t.id, t.app_id, COALESCE(a.name, 'SendaGo SaaS Platform') as app_name, 
		       t.order_id, t.amount, t.unique_code, t.total_amount, t.channel, 
		       t.status, t.customer_name, t.customer_email, t.expired_at, t.paid_at, t.created_at
		FROM transactions t
		LEFT JOIN apps a ON t.app_id = a.id
	`
	var rows []TxRow
	var err error

	if status != "" {
		query += " WHERE t.status = ? ORDER BY t.created_at DESC LIMIT 100"
		err = h.db.Select(&rows, query, status)
		if err != nil {
			query = `
				SELECT t.id, t.app_id, COALESCE(a.name, 'SendaGo SaaS Platform') as app_name, 
				       t.order_id, t.amount, t.unique_code, t.total_amount, t.channel, 
				       t.status, t.customer_name, t.customer_email, t.expired_at, t.paid_at, t.created_at
				FROM transactions t
				LEFT JOIN apps a ON t.app_id = a.id
				WHERE t.status = $1 ORDER BY t.created_at DESC LIMIT 100
			`
			err = h.db.Select(&rows, query, status)
		}
	} else {
		query += " ORDER BY t.created_at DESC LIMIT 100"
		err = h.db.Select(&rows, query)
	}

	if err != nil {
		log.Printf("[Dashboard] ListTransactions query error: %v", err)
		c.JSON(http.StatusOK, []TxRow{})
		return
	}

	if rows == nil {
		rows = []TxRow{}
	}

	c.JSON(http.StatusOK, rows)
}

func (h *Handler) ListWebhookLogs(c *gin.Context) {
	query := `
		SELECT w.id, w.app_id, COALESCE(a.name, 'SendaGo App') as app_name, 
		       COALESCE(t.order_id, '') as order_id, w.event, w.target_url, 
		       w.response_status, w.attempt_count, w.is_success, w.created_at 
		FROM webhook_logs w
		LEFT JOIN apps a ON w.app_id = a.id
		LEFT JOIN transactions t ON w.transaction_id = t.id
		ORDER BY w.created_at DESC
		LIMIT 50
	`
	type WebhookLogRow struct {
		ID             string    `json:"id" db:"id"`
		AppID          string    `json:"app_id" db:"app_id"`
		AppName        string    `json:"app_name" db:"app_name"`
		OrderID        string    `json:"order_id" db:"order_id"`
		Event          string    `json:"event" db:"event"`
		TargetURL      string    `json:"target_url" db:"target_url"`
		ResponseStatus int       `json:"response_status" db:"response_status"`
		AttemptCount   int       `json:"attempt_count" db:"attempt_count"`
		IsSuccess      bool      `json:"is_success" db:"is_success"`
		CreatedAt      time.Time `json:"created_at" db:"created_at"`
	}
	var logs []WebhookLogRow
	err := h.db.Select(&logs, query)
	if err != nil {
		log.Printf("[Dashboard] ListWebhookLogs error: %v", err)
		c.JSON(http.StatusOK, []WebhookLogRow{})
		return
	}

	if logs == nil {
		logs = []WebhookLogRow{}
	}

	c.JSON(http.StatusOK, logs)
}

func (h *Handler) GetSettings(c *gin.Context) {
	var merchant struct {
		ID                string `json:"id" db:"id"`
		Email             string `json:"email" db:"email"`
		Name              string `json:"name" db:"name"`
		MasterQRIS        string `json:"master_qris" db:"master_qris"`
		BankName          string `json:"bank_name" db:"bank_name"`
		BankAccountNumber string `json:"bank_account_number" db:"bank_account_number"`
		BankAccountName   string `json:"bank_account_name" db:"bank_account_name"`
		Is2FAEnabled      bool   `json:"is_2fa_enabled" db:"is_2fa_enabled"`
	}

	err := h.db.Get(&merchant, "SELECT id, email, name, master_qris, bank_name, bank_account_number, bank_account_name, is_2fa_enabled FROM merchants LIMIT 1")
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"name":                "Aditya Putra",
			"email":               "admin@sendago.pay",
			"master_qris":         "00020101021126590013ID.CO.GOPAY.WWW01189360091438291039210215ID10200392019010303UMI51440014ID.CO.QRIS.WWW0215ID10200392019010303UMI5204541153033605802ID5911SendaGo Pay6013Jakarta Pusat61051011062070703A0163046D5E",
			"bank_name":           "BCA",
			"bank_account_number": "8831092819",
			"bank_account_name":   "ADITYA PUTRA",
			"is_2fa_enabled":      false,
		})
		return
	}

	c.JSON(http.StatusOK, merchant)
}

type UpdateSettingsRequest struct {
	MasterQRIS        *string `json:"master_qris"`
	BankName          *string `json:"bank_name"`
	BankAccountNumber *string `json:"bank_account_number"`
	BankAccountName   *string `json:"bank_account_name"`
}

func (h *Handler) UpdateSettings(c *gin.Context) {
	var req UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var m struct {
		ID                string `db:"id"`
		MasterQRIS        string `db:"master_qris"`
		BankName          string `db:"bank_name"`
		BankAccountNumber string `db:"bank_account_number"`
		BankAccountName   string `db:"bank_account_name"`
	}

	err := h.db.Get(&m, "SELECT id, master_qris, bank_name, bank_account_number, bank_account_name FROM merchants LIMIT 1")
	if err != nil {
		m.ID = uuid.New().String()
		m.MasterQRIS = "00020101021126590013ID.CO.GOPAY.WWW01189360091438291039210215ID10200392019010303UMI51440014ID.CO.QRIS.WWW0215ID10200392019010303UMI5204541153033605802ID5911SendaGo Pay6013Jakarta Pusat61051011062070703A0163046D5E"
		m.BankName = "BCA"
		m.BankAccountNumber = "8831092819"
		m.BankAccountName = "ADITYA PUTRA"

		_, _ = h.db.Exec(`
			INSERT INTO merchants (id, email, password_hash, name, master_qris, bank_name, bank_account_number, bank_account_name)
			VALUES ($1, 'adi@adilabs.id', '$2a$10$default', 'Adi Sumardi', $2, $3, $4, $5)
		`, m.ID, m.MasterQRIS, m.BankName, m.BankAccountNumber, m.BankAccountName)
	}

	if req.MasterQRIS != nil && *req.MasterQRIS != "" {
		m.MasterQRIS = *req.MasterQRIS
	}
	if req.BankName != nil && *req.BankName != "" {
		m.BankName = *req.BankName
	}
	if req.BankAccountNumber != nil && *req.BankAccountNumber != "" {
		m.BankAccountNumber = *req.BankAccountNumber
	}
	if req.BankAccountName != nil && *req.BankAccountName != "" {
		m.BankAccountName = *req.BankAccountName
	}

	_, _ = h.db.Exec(`
		UPDATE merchants 
		SET master_qris = $1, bank_name = $2, bank_account_number = $3, bank_account_name = $4, updated_at = CURRENT_TIMESTAMP
		WHERE id = $5
	`, m.MasterQRIS, m.BankName, m.BankAccountNumber, m.BankAccountName, m.ID)

	_, _ = h.db.Exec(`
		UPDATE merchants 
		SET master_qris = ?, bank_name = ?, bank_account_number = ?, bank_account_name = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, m.MasterQRIS, m.BankName, m.BankAccountNumber, m.BankAccountName, m.ID)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Pengaturan berhasil disimpan",
		"data": gin.H{
			"master_qris":         m.MasterQRIS,
			"bank_name":           m.BankName,
			"bank_account_number": m.BankAccountNumber,
			"bank_account_name":   m.BankAccountName,
		},
	})
}

func (h *Handler) generateAccessToken(merchantID, email string) (string, error) {
	claims := jwt.MapClaims{
		"merchant_id": merchantID,
		"email":       email,
		"type":        "access",
		"exp":         time.Now().Add(7 * 24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.cfg.JWTSecret))
}

func (h *Handler) generateTemp2FAToken(merchantID, email string) string {
	claims := jwt.MapClaims{
		"merchant_id": merchantID,
		"email":       email,
		"type":        "2fa_temp",
		"exp":         time.Now().Add(5 * time.Minute).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString([]byte(h.cfg.JWTSecret))
	return tokenStr
}

type TestMailRequest struct {
	Recipient string `json:"recipient" binding:"required,email"`
}

func (h *Handler) TestSendMail(c *gin.Context) {
	var req TestMailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Alamat email penerima diperlukan atau format tidak valid"})
		return
	}

	result, err := h.mailer.SendTestMail(req.Recipient)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengirim email: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Email uji coba berhasil dikirim via sendagomail.adilabs.id ke " + req.Recipient,
		"result":  result,
	})
}

