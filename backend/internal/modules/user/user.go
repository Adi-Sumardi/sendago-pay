package user

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"

	"sendagopay-backend/internal/config"
	"sendagopay-backend/internal/mailer"
)

type AdminUser struct {
	ID           string    `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	Name         string    `json:"name" db:"name"`
	Role         string    `json:"role" db:"role"`     // SUPER_ADMIN, FINANCE, DEVELOPER, VIEWER
	Status       string    `json:"status" db:"status"` // ACTIVE, SUSPENDED
	Is2FAEnabled bool      `json:"is_2fa_enabled" db:"is_2fa_enabled"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type CreateUserRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Role     string `json:"role" binding:"required"`
}

type UpdateUserRequest struct {
	Name     string  `json:"name"`
	Email    string  `json:"email"`
	Role     string  `json:"role"`
	Status   string  `json:"status"`
	Password *string `json:"password"`
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

func (h *Handler) ListUsers(c *gin.Context) {
	var users []AdminUser
	err := h.db.Select(&users, `
		SELECT id, email, name, role, status, is_2fa_enabled, created_at, updated_at 
		FROM admin_users 
		ORDER BY created_at ASC
	`)
	if err != nil {
		c.JSON(http.StatusOK, []AdminUser{})
		return
	}
	if users == nil {
		users = []AdminUser{}
	}
	c.JSON(http.StatusOK, users)
}

func (h *Handler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	newUser := AdminUser{
		ID:           uuid.New().String(),
		Email:        req.Email,
		Name:         req.Name,
		Role:         req.Role,
		Status:       "ACTIVE",
		Is2FAEnabled: false,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	query := h.db.Rebind(`
		INSERT INTO admin_users (id, email, password_hash, name, role, status, is_2fa_enabled, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
	_, err = h.db.Exec(query, newUser.ID, newUser.Email, string(hash), newUser.Name, newUser.Role, newUser.Status, false, newUser.CreatedAt, newUser.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email already registered: " + err.Error()})
		return
	}

	// Dispatch Invitation Email via sendagomail.adilabs.id
	go func() {
		_, _ = h.mailer.SendUserInvitationEmail(newUser.Email, newUser.Name, newUser.Role, req.Password)
	}()

	c.JSON(http.StatusCreated, newUser)
}

func (h *Handler) UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Password != nil && *req.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err == nil {
			updatePwdAdmin := h.db.Rebind("UPDATE admin_users SET password_hash = ? WHERE id = ?")
			_, _ = h.db.Exec(updatePwdAdmin, string(hash), id)

			updatePwdMerchant := h.db.Rebind("UPDATE merchants SET password_hash = ? WHERE id = ? OR email = ?")
			_, _ = h.db.Exec(updatePwdMerchant, string(hash), id, req.Email)
		}
	}

	updateQuery := h.db.Rebind(`
		UPDATE admin_users 
		SET name = COALESCE(NULLIF(?, ''), name),
		    email = COALESCE(NULLIF(?, ''), email),
		    role = COALESCE(NULLIF(?, ''), role),
		    status = COALESCE(NULLIF(?, ''), status),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`)
	_, _ = h.db.Exec(updateQuery, req.Name, req.Email, req.Role, req.Status, id)

	var updated AdminUser
	selectQuery := h.db.Rebind("SELECT id, email, name, role, status, is_2fa_enabled, created_at, updated_at FROM admin_users WHERE id = ? LIMIT 1")
	_ = h.db.Get(&updated, selectQuery, id)

	c.JSON(http.StatusOK, updated)
}

func (h *Handler) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	query := h.db.Rebind("DELETE FROM admin_users WHERE id = ?")
	_, _ = h.db.Exec(query, id)

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "User deleted"})
}

func (h *Handler) Reset2FA(c *gin.Context) {
	id := c.Param("id")
	query := h.db.Rebind("UPDATE admin_users SET is_2fa_enabled = false, totp_secret = '' WHERE id = ?")
	_, _ = h.db.Exec(query, id)

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "2FA for user has been reset"})
}
