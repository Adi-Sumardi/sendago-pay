-- SendaGo Pay 2.0 Database Schema (PostgreSQL)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Merchants / Admin Configuration
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

-- 2. Client Apps (Multi-App Tenant)
CREATE TABLE IF NOT EXISTS apps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    public_key VARCHAR(64) UNIQUE NOT NULL,    -- sg_live_pk_...
    secret_key VARCHAR(64) UNIQUE NOT NULL,    -- sg_live_sk_...
    webhook_url TEXT DEFAULT '',
    webhook_secret VARCHAR(64) NOT NULL,       -- whsec_...
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Transactions Table
CREATE TYPE transaction_status AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED', 'CANCELLED');
CREATE TYPE payment_channel AS ENUM ('QRIS', 'BANK_TRANSFER', 'VIRTUAL_ACCOUNT');

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    order_id VARCHAR(255) NOT NULL,             -- Unique per client app
    amount NUMERIC(15, 2) NOT NULL,             -- Base amount in IDR
    unique_code INT DEFAULT 0,                  -- 3 digit code (e.g. 247)
    total_amount NUMERIC(15, 2) NOT NULL,       -- amount + unique_code
    channel payment_channel NOT NULL DEFAULT 'QRIS',
    status transaction_status NOT NULL DEFAULT 'PENDING',
    customer_name VARCHAR(255) DEFAULT '',
    customer_email VARCHAR(255) DEFAULT '',
    customer_phone VARCHAR(50) DEFAULT '',
    qris_payload TEXT DEFAULT '',               -- Injected Dynamic EMVCo QRIS
    notes TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}'::jsonb,
    redirect_url TEXT DEFAULT '',
    expired_at TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_app_order UNIQUE(app_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_total_amount ON transactions(total_amount);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_metadata ON transactions USING gin(metadata);

-- 4. Bank / QRIS Mutations Log
CREATE TABLE IF NOT EXISTS bank_mutations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_source VARCHAR(100) NOT NULL,          -- e.g. BCA, MANDIRI, DANA, GOBIZ, CEKMUTASI
    type VARCHAR(20) NOT NULL DEFAULT 'CR',     -- CR (Credit / In) or DB (Debit / Out)
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT DEFAULT '',
    matched_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bank_mutations_amount ON bank_mutations(amount);

-- 5. Outbound Webhook Delivery Logs
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    event VARCHAR(100) NOT NULL,                -- e.g. payment.success, payment.expired
    target_url TEXT NOT NULL,
    request_headers JSONB DEFAULT '{}'::jsonb,
    request_payload JSONB NOT NULL,
    response_status INT DEFAULT 0,
    response_body TEXT DEFAULT '',
    attempt_count INT DEFAULT 1,
    is_success BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_app_id ON webhook_logs(app_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_transaction_id ON webhook_logs(transaction_id);

-- 6. Key Regeneration Approval Queue
CREATE TABLE IF NOT EXISTS key_regeneration_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    app_name VARCHAR(255) NOT NULL,
    requested_by VARCHAR(255) NOT NULL,
    environment VARCHAR(50) NOT NULL DEFAULT 'production',
    reason TEXT NOT NULL,
    notes TEXT DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    approved_by VARCHAR(255) DEFAULT '',
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT DEFAULT '',
    email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_key_requests_status ON key_regeneration_requests(status);
CREATE INDEX IF NOT EXISTS idx_key_requests_app_id ON key_regeneration_requests(app_id);

-- 7. Admin Users & Role-Based Access Control (RBAC)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'DEVELOPER',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    totp_secret VARCHAR(64) DEFAULT '',
    is_2fa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

