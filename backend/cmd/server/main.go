package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"sendagopay-backend/internal/config"
	"sendagopay-backend/internal/database"
	"sendagopay-backend/internal/middleware"
	"sendagopay-backend/internal/modules/app"
	"sendagopay-backend/internal/modules/dashboard"
	"sendagopay-backend/internal/modules/mutation"
	"sendagopay-backend/internal/modules/payment"
	"sendagopay-backend/internal/modules/user"
	"sendagopay-backend/internal/modules/webhook"
	"sendagopay-backend/internal/qris"
	"sendagopay-backend/internal/redis"
	"sendagopay-backend/internal/uniquecode"
)

func main() {
	log.Println("🚀 Starting SendaGo Pay 2.0 Engine...")

	cfg := config.Load()

	// 1. Initialize Database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("❌ Database connection failed: %v", err)
	}
	defer db.Close()

	// 2. Initialize Redis
	rdb := redis.Connect(cfg.RedisURL)

	// 3. Initialize Shared Services
	codeGen := uniquecode.NewGenerator(rdb)
	dispatcher := webhook.NewDispatcher(db)

	// 4. Initialize Module Handlers
	appHandler := app.NewHandler(db, cfg)
	paymentHandler := payment.NewHandler(db, rdb, cfg, codeGen, dispatcher)
	mutationHandler := mutation.NewHandler(db, rdb, cfg, codeGen, dispatcher)
	dashboardHandler := dashboard.NewHandler(db, cfg)
	userHandler := user.NewHandler(db, cfg)

	// 5. Setup Gin Router
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Setup CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-API-Key"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health check
	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"app":     "SendaGo Pay 2.0",
			"time":    time.Now().Format(time.RFC3339),
			"version": "2.0.0",
		})
	})

	// Public API & Client Integration Routes
	v1 := r.Group("/v1")
	{
		// Transaction creation (Client apps call this with API Key)
		v1.POST("/payments", middleware.RequireAPIKey(db), paymentHandler.CreatePayment)

		// Public Checkout Page routes (No auth needed, secured by UUID)
		v1.GET("/payments/:id", paymentHandler.GetPayment)
		v1.GET("/payments/:id/stream", paymentHandler.PaymentStatusSSE)

		// Inbound Bank / QRIS Mutation Webhook
		v1.POST("/mutations/webhook", mutationHandler.InboundMutationWebhook)

		// Admin & Merchant Dashboard Routes
		admin := v1.Group("/admin")
		{
			admin.POST("/login", dashboardHandler.Login)
			admin.GET("/me", dashboardHandler.GetMe)

			// 2FA Endpoints
			admin.POST("/2fa/setup", dashboardHandler.Setup2FA)
			admin.POST("/2fa/verify-enable", dashboardHandler.VerifyAndEnable2FA)
			admin.POST("/2fa/disable", dashboardHandler.Disable2FA)

			// Quick QRIS simulation tool
			admin.POST("/qris/simulate", func(c *gin.Context) {
				var req struct {
					MasterQRIS string `json:"master_qris"`
					Amount     int64  `json:"amount"`
				}
				if err := c.ShouldBindJSON(&req); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				if req.MasterQRIS == "" {
					var dbMaster string
					_ = db.Get(&dbMaster, "SELECT master_qris FROM merchants WHERE master_qris != '' LIMIT 1")
					if dbMaster != "" {
						req.MasterQRIS = dbMaster
					} else {
						req.MasterQRIS = cfg.DefaultMasterQRIS
					}
				}
				dynamicQR, err := qris.GenerateDynamicQRIS(req.MasterQRIS, req.Amount)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{
					"dynamic_qris": dynamicQR,
					"amount":       req.Amount,
				})
			})

			// Dashboard APIs
			admin.GET("/stats", dashboardHandler.GetSummaryStats)
			admin.GET("/transactions", dashboardHandler.ListTransactions)
			admin.POST("/transactions/:id/reconcile", mutationHandler.ManualReconcile)
			admin.GET("/webhooks/logs", dashboardHandler.ListWebhookLogs)

			// Multi-App Management
			admin.GET("/apps", appHandler.ListApps)
			admin.POST("/apps", appHandler.CreateApp)
			admin.PUT("/apps/:id", appHandler.UpdateApp)
			admin.POST("/apps/:id/regenerate-keys", appHandler.RegenerateKeys)
			admin.POST("/apps/:id/request-regenerate", appHandler.SubmitKeyRegenRequest)
			admin.POST("/apps/:id/revoke", appHandler.RevokeKey)
			admin.DELETE("/apps/:id", appHandler.DeleteApp)

			// Key Regeneration Approvals
			admin.GET("/key-requests", appHandler.ListKeyRegenRequests)
			admin.POST("/key-requests/:id/approve", appHandler.ApproveKeyRegenRequest)
			admin.POST("/key-requests/:id/reject", appHandler.RejectKeyRegenRequest)

			// User Management & RBAC
			admin.GET("/users", userHandler.ListUsers)
			admin.POST("/users", userHandler.CreateUser)
			admin.PUT("/users/:id", userHandler.UpdateUser)
			admin.DELETE("/users/:id", userHandler.DeleteUser)
			admin.POST("/users/:id/reset-2fa", userHandler.Reset2FA)

			// Settings
			admin.GET("/settings", dashboardHandler.GetSettings)
			admin.PUT("/settings", dashboardHandler.UpdateSettings)

			// SendagoMail Engine Test
			admin.POST("/mail/test", dashboardHandler.TestSendMail)
		}
	}

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	go func() {
		log.Printf("✨ SendaGo Pay 2.0 server listening on port :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down server gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("✅ SendaGo Pay server exited cleanly.")
}
