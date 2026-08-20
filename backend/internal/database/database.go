package database

import (
	"log"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

func Connect(dbURL string) (*sqlx.DB, error) {
	// 1. Try connecting to PostgreSQL
	db, err := sqlx.Connect("postgres", dbURL)
	if err == nil {
		db.SetMaxOpenConns(25)
		db.SetMaxIdleConns(10)
		db.SetConnMaxLifetime(5 * time.Minute)

		if err := runMigrations(db, true); err != nil {
			log.Printf("[DB] Warning running Postgres auto-migration: %v", err)
		} else {
			log.Println("[DB] Successfully connected to PostgreSQL")
			seedInitialData(db)
			return db, nil
		}
	}

	// 2. Fallback to Local Embedded SQLite Database
	log.Printf("[DB] PostgreSQL unavailable (%v). Falling back to Local SQLite Engine...", err)
	sqliteDB, err := sqlx.Connect("sqlite", "file:sendago_local.db?cache=shared&mode=rwc")
	if err != nil {
		return nil, err
	}

	if err := runMigrations(sqliteDB, false); err != nil {
		log.Printf("[DB] SQLite migration error: %v", err)
	}

	seedInitialData(sqliteDB)
	log.Println("[DB] ✅ SendaGo Local Database (SQLite) Ready")
	return sqliteDB, nil
}

func runMigrations(db *sqlx.DB, isPostgres bool) error {
	if isPostgres {
		schema := `
		CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

		CREATE TABLE IF NOT EXISTS merchants (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			name VARCHAR(255) NOT NULL,
			master_qris TEXT DEFAULT '',
			bank_name VARCHAR(100) DEFAULT 'BCA',
			bank_account_number VARCHAR(100) DEFAULT '',
			bank_account_name VARCHAR(255) DEFAULT '',
			totp_secret VARCHAR(64) DEFAULT '',
			is_2fa_enabled BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);

		ALTER TABLE merchants ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64) DEFAULT '';
		ALTER TABLE merchants ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE;

		CREATE TABLE IF NOT EXISTS admin_users (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			name VARCHAR(255) NOT NULL,
			role VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN',
			status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
			totp_secret VARCHAR(64) DEFAULT '',
			is_2fa_enabled BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS apps (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			description TEXT DEFAULT '',
			public_key VARCHAR(64) UNIQUE NOT NULL,
			secret_key VARCHAR(64) UNIQUE NOT NULL,
			webhook_url TEXT DEFAULT '',
			webhook_secret VARCHAR(64) NOT NULL,
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);

		DO $$ BEGIN
			CREATE TYPE transaction_status AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED', 'CANCELLED');
		EXCEPTION
			WHEN duplicate_object THEN null;
		END $$;

		DO $$ BEGIN
			CREATE TYPE payment_channel AS ENUM ('QRIS', 'BANK_TRANSFER', 'VIRTUAL_ACCOUNT');
		EXCEPTION
			WHEN duplicate_object THEN null;
		END $$;

		CREATE TABLE IF NOT EXISTS transactions (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
			order_id VARCHAR(255) NOT NULL,
			amount NUMERIC(15, 2) NOT NULL,
			unique_code INT DEFAULT 0,
			total_amount NUMERIC(15, 2) NOT NULL,
			channel payment_channel NOT NULL DEFAULT 'QRIS',
			status transaction_status NOT NULL DEFAULT 'PENDING',
			customer_name VARCHAR(255) DEFAULT '',
			customer_email VARCHAR(255) DEFAULT '',
			customer_phone VARCHAR(50) DEFAULT '',
			qris_payload TEXT DEFAULT '',
			notes TEXT DEFAULT '',
			metadata JSONB DEFAULT '{}'::jsonb,
			redirect_url TEXT DEFAULT '',
			expired_at TIMESTAMP WITH TIME ZONE NOT NULL,
			paid_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT unique_app_order UNIQUE(app_id, order_id)
		);

		ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
		ALTER TABLE transactions ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'QRIS';

		CREATE TABLE IF NOT EXISTS bank_mutations (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			bank_source VARCHAR(100) NOT NULL,
			type VARCHAR(20) NOT NULL DEFAULT 'CR',
			amount NUMERIC(15, 2) NOT NULL,
			description TEXT DEFAULT '',
			matched_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
			raw_payload JSONB DEFAULT '{}'::jsonb,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS webhook_logs (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
			transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
			event VARCHAR(100) NOT NULL,
			target_url TEXT NOT NULL,
			request_headers JSONB DEFAULT '{}'::jsonb,
			request_payload JSONB NOT NULL,
			response_status INT DEFAULT 0,
			response_body TEXT DEFAULT '',
			attempt_count INT DEFAULT 1,
			is_success BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS key_regeneration_requests (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
			app_name VARCHAR(255) NOT NULL,
			requested_by VARCHAR(255) NOT NULL,
			environment VARCHAR(50) NOT NULL DEFAULT 'production',
			reason VARCHAR(255) NOT NULL,
			notes TEXT DEFAULT '',
			status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
			approved_by VARCHAR(255) DEFAULT '',
			approved_at TIMESTAMP WITH TIME ZONE,
			rejection_reason TEXT DEFAULT '',
			email_sent BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);
		`
		_, err := db.Exec(schema)
		return err
	}

	// SQLite Schema
	sqliteSchema := `
	CREATE TABLE IF NOT EXISTS merchants (
		id TEXT PRIMARY KEY,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		name TEXT NOT NULL,
		master_qris TEXT DEFAULT '',
		bank_name TEXT DEFAULT 'BCA',
		bank_account_number TEXT DEFAULT '',
		bank_account_name TEXT DEFAULT '',
		totp_secret TEXT DEFAULT '',
		is_2fa_enabled INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS admin_users (
		id TEXT PRIMARY KEY,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		name TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
		status TEXT NOT NULL DEFAULT 'ACTIVE',
		totp_secret TEXT DEFAULT '',
		is_2fa_enabled INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS apps (
		id TEXT PRIMARY KEY,
		merchant_id TEXT NOT NULL,
		name TEXT NOT NULL,
		description TEXT DEFAULT '',
		public_key TEXT UNIQUE NOT NULL,
		secret_key TEXT UNIQUE NOT NULL,
		webhook_url TEXT DEFAULT '',
		webhook_secret TEXT NOT NULL,
		is_active INTEGER DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS transactions (
		id TEXT PRIMARY KEY,
		app_id TEXT NOT NULL,
		order_id TEXT NOT NULL,
		amount REAL NOT NULL,
		unique_code INTEGER DEFAULT 0,
		total_amount REAL NOT NULL,
		channel TEXT NOT NULL DEFAULT 'QRIS',
		status TEXT NOT NULL DEFAULT 'PENDING',
		customer_name TEXT DEFAULT '',
		customer_email TEXT DEFAULT '',
		customer_phone TEXT DEFAULT '',
		qris_payload TEXT DEFAULT '',
		notes TEXT DEFAULT '',
		metadata TEXT DEFAULT '{}',
		redirect_url TEXT DEFAULT '',
		expired_at DATETIME NOT NULL,
		paid_at DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS bank_mutations (
		id TEXT PRIMARY KEY,
		bank_source TEXT NOT NULL,
		type TEXT NOT NULL DEFAULT 'CR',
		amount REAL NOT NULL,
		description TEXT DEFAULT '',
		matched_transaction_id TEXT,
		raw_payload TEXT DEFAULT '{}',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS webhook_logs (
		id TEXT PRIMARY KEY,
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

	CREATE TABLE IF NOT EXISTS key_regeneration_requests (
		id TEXT PRIMARY KEY,
		app_id TEXT NOT NULL,
		app_name TEXT NOT NULL,
		requested_by TEXT NOT NULL,
		environment TEXT NOT NULL DEFAULT 'production',
		reason TEXT NOT NULL,
		notes TEXT DEFAULT '',
		status TEXT NOT NULL DEFAULT 'PENDING',
		approved_by TEXT DEFAULT '',
		approved_at DATETIME,
		rejection_reason TEXT DEFAULT '',
		email_sent INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := db.Exec(sqliteSchema)
	if err != nil {
		return err
	}

	// SQLite migrations for existing local database files
	_, _ = db.Exec("ALTER TABLE transactions ADD COLUMN metadata TEXT DEFAULT '{}'")
	_, _ = db.Exec("ALTER TABLE transactions ADD COLUMN channel TEXT DEFAULT 'QRIS'")

	return nil
}

func seedInitialData(db *sqlx.DB) {
	defaultHash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	hashStr := string(defaultHash)

	// Ensure any legacy default hash is updated to real bcrypt hash
	_, _ = db.Exec("UPDATE merchants SET password_hash = ? WHERE password_hash = '$2a$10$default'", hashStr)
	_, _ = db.Exec("UPDATE merchants SET password_hash = $1 WHERE password_hash = '$2a$10$default'", hashStr)
	_, _ = db.Exec("UPDATE admin_users SET password_hash = ? WHERE password_hash = '$2a$10$default'", hashStr)
	_, _ = db.Exec("UPDATE admin_users SET password_hash = $1 WHERE password_hash = '$2a$10$default'", hashStr)

	var count int
	_ = db.Get(&count, "SELECT COUNT(*) FROM merchants")
	if count == 0 {
		_, _ = db.Exec(`
			INSERT INTO merchants (id, email, password_hash, name, master_qris, bank_name, bank_account_number, bank_account_name, is_2fa_enabled)
			VALUES (
				'00000000-0000-0000-0000-000000000001',
				'admin@sendago.pay',
				?,
				'Aditya Putra',
				'00020101021126590013ID.CO.GOPAY.WWW01189360091438291039210215ID10200392019010303UMI51440014ID.CO.QRIS.WWW0215ID10200392019010303UMI5204541153033605802ID5911SendaGo Pay6013Jakarta Pusat61051011062070703A0163046D5E',
				'BCA',
				'8831092819',
				'ADITYA PUTRA',
				0
			)
		`, hashStr)

		_, _ = db.Exec(`
			INSERT INTO apps (id, merchant_id, name, description, public_key, secret_key, webhook_url, webhook_secret, is_active)
			VALUES (
				'app-default-1',
				'00000000-0000-0000-0000-000000000001',
				'SendaGo SaaS Platform',
				'Aplikasi utama SaaS SendaGo',
				'sg_live_pk_88a91b2c4d5e6f7a',
				'sg_live_sk_99b82c3d4e5f6a7b8c9d0e1f',
				'https://api.sendago.com/webhooks/payment',
				'whsec_77c88d99e00f11a22b33c44d',
				TRUE
			)
		`)
	}

	// Seed default admin users
	var userCount int
	_ = db.Get(&userCount, "SELECT COUNT(*) FROM admin_users")
	if userCount == 0 {
		_, _ = db.Exec(`
			INSERT INTO admin_users (id, email, password_hash, name, role, status, is_2fa_enabled)
			VALUES 
			(
				'usr-001',
				'admin@sendago.pay',
				?,
				'Aditya Putra (Super Admin)',
				'SUPER_ADMIN',
				'ACTIVE',
				0
			),
			(
				'usr-002',
				'sarah.finance@sendago.pay',
				?,
				'Sarah Wulandari',
				'FINANCE',
				'ACTIVE',
				1
			),
			(
				'usr-003',
				'budi.dev@sendago.pay',
				?,
				'Budi Setiawan',
				'DEVELOPER',
				'ACTIVE',
				0
			)
		`, hashStr, hashStr, hashStr)
	}
}
