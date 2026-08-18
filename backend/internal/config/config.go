package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	AppEnv             string
	DatabaseURL        string
	RedisURL           string
	JWTSecret          string
	DashboardURL       string
	DefaultMasterQRIS  string
	DefaultBankName       string
	DefaultBankAccount    string
	DefaultBankHolder     string
	SendagoMailMemberID   string
	SendagoMailSecret     string
	SendagoMailEndpoint   string
	SendagoMailFromAddr   string
}

func Load() *Config {
	_ = godotenv.Load()

	return &Config{
		Port:                  getEnv("PORT", "8000"),
		AppEnv:                getEnv("APP_ENV", "development"),
		DatabaseURL:           getEnv("DATABASE_URL", "postgres://sendago:sendagosecret@localhost:5432/sendago_pay?sslmode=disable"),
		RedisURL:              getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:             getEnv("JWT_SECRET", "sendago-super-secret-jwt-key-2026-very-secure"),
		DashboardURL:          getEnv("DASHBOARD_URL", "http://localhost:3000"),
		DefaultMasterQRIS:     getEnv("DEFAULT_MASTER_QRIS", "00020101021126590013ID.CO.GOPAY.WWW01189360091438291039210215ID10200392019010303UMI51440014ID.CO.QRIS.WWW0215ID10200392019010303UMI5204541153033605802ID5911SendaGo Pay6013Jakarta Pusat61051011062070703A0163046D5E"),
		DefaultBankName:       getEnv("DEFAULT_BANK_NAME", "BCA"),
		DefaultBankAccount:    getEnv("DEFAULT_BANK_ACCOUNT", "8831092819"),
		DefaultBankHolder:     getEnv("DEFAULT_BANK_HOLDER", "ADITYA PUTRA"),
		SendagoMailMemberID:   getEnv("SENDAGOMAIL_MEMBER_ID", "mbr_1e442b7427c3ee2f"),
		SendagoMailSecret:     getEnv("SENDAGOMAIL_SECRET", "c01351606fdba6885fa5ded03144c92bb6f406ada10dd0e2"),
		SendagoMailEndpoint:   getEnv("SENDAGOMAIL_ENDPOINT", "https://sendagomail.adilabs.id/emails/api-send"),
		SendagoMailFromAddr:   getEnv("SENDAGOMAIL_FROM_ADDR", "sendmail@adilabs.id"),
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
