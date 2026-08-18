# SendaGo Payment Architecture

## Vision

**One API for Every Payment**

SendaGo Payment is designed as a **Payment Orchestration Platform**, not
a licensed payment gateway. It provides a single API that integrates
multiple payment providers (Midtrans, Xendit, DOKU, Duitku, QRIS, Bank
VA, E-Wallets, etc.), allowing merchants to switch providers without
changing application code.

------------------------------------------------------------------------

# High Level Architecture

``` text
                    Internet
                        │
                 Cloudflare CDN
                        │
                 Load Balancer
                        │
                  API Gateway
                        │
─────────────────────────────────────────────────────────
 Identity Service
 User Service
 Merchant Service
 Payment Service
 Invoice Service
 Wallet Service
 Settlement Service
 Notification Service
 Webhook Service
 Fraud Service
 Reconciliation Service
 Billing Service
 Reporting Service
─────────────────────────────────────────────────────────
                  Kafka / RabbitMQ
─────────────────────────────────────────────────────────
 PostgreSQL
 Redis
 Object Storage (MinIO / S3)
 ClickHouse
─────────────────────────────────────────────────────────
              Payment Connector Layer
─────────────────────────────────────────────────────────
 Midtrans Adapter
 Xendit Adapter
 DOKU Adapter
 Duitku Adapter
 QRIS Adapter
 Bank Adapter
```

------------------------------------------------------------------------

# Core Modules

## Identity Service

-   Authentication
-   OAuth2 / JWT
-   API Keys
-   RBAC

## Merchant Service

-   Merchant profile
-   API Keys
-   Callback URLs
-   Webhook configuration

## Payment Service

-   Create payment
-   Cancel payment
-   Expire payment
-   Payment status
-   Payment lifecycle

## Invoice Service

-   Invoice generation
-   PDF invoice
-   Email delivery
-   Payment reminder

## Wallet Service

-   Merchant balance
-   Top up
-   Withdraw
-   Transaction history

## Settlement Service

-   Settlement calculation
-   Fees
-   Taxes
-   Daily payout
-   Settlement reports

## Notification Service

-   Email
-   WhatsApp
-   Push Notification
-   SMS

## Webhook Service

Normalize every provider into a unified event format:

``` text
payment.created
payment.pending
payment.success
payment.failed
payment.expired
payment.refunded
```

## Fraud Service

-   Velocity checks
-   Duplicate transaction detection
-   Device fingerprint (future)
-   Risk scoring (future)

## Reconciliation Service

Compare: - Internal database - Provider transaction - Bank settlement

Generate alerts if mismatched.

## Billing Service

-   Subscription
-   Usage billing
-   API billing

## Reporting Service

-   Revenue
-   Transaction reports
-   Settlement reports
-   Merchant analytics

------------------------------------------------------------------------

# Connector Layer

Each connector converts provider-specific APIs into the internal SendaGo
Payment format.

Example connectors: - Midtrans - Xendit - DOKU - Duitku - QRIS - Bank VA

------------------------------------------------------------------------

# Payment Flow

``` text
Merchant
    │
Create Payment
    │
API Gateway
    │
Payment Service
    │
Routing Engine
    │
Selected Connector
    │
Payment Provider
    │
Webhook
    │
Webhook Service
    │
Payment Service
    │
Notification
    │
Merchant Callback
```

------------------------------------------------------------------------

# Routing Engine

Rules: - Primary provider selection - Automatic failover - Retry
policy - Cost optimization - Response time optimization

Example:

Provider A Down → Provider B → Provider C

------------------------------------------------------------------------

# Database

## PostgreSQL

-   Users
-   Merchants
-   Transactions
-   Settlement
-   Wallet
-   Invoice

## Redis

-   Cache
-   Session
-   Rate limit
-   OTP

## ClickHouse

-   Analytics
-   Reporting
-   Event logs

## MinIO

-   Invoice PDF
-   Merchant documents
-   Payment proof

------------------------------------------------------------------------

# Recommended Tech Stack

  Layer           Technology
  --------------- -----------------------------
  Backend         Go
  Admin Panel     Laravel
  Frontend        Next.js
  Mobile SDK      Flutter
  Queue           Kafka
  Cache           Redis
  Database        PostgreSQL
  Analytics       ClickHouse
  Storage         MinIO
  Container       Docker
  Orchestration   Kubernetes
  Monitoring      Prometheus + Grafana + Loki
  CI/CD           GitHub Actions

------------------------------------------------------------------------

# Public APIs

-   POST /payments
-   GET /payments/{id}
-   POST /refunds
-   POST /invoice
-   GET /settlements
-   POST /webhooks/test
-   POST /payment-links
-   POST /subscriptions

------------------------------------------------------------------------

# Dashboard

## Merchant

-   Dashboard
-   Transactions
-   Payment Links
-   QRIS
-   Invoice
-   Refund
-   Settlement
-   API Keys
-   Webhooks
-   Analytics

## Admin

-   Merchants
-   Transactions
-   Providers
-   Settlement
-   Monitoring
-   Revenue
-   Fraud
-   Support

------------------------------------------------------------------------

# Product Roadmap

## Phase 1

-   Payment Link
-   Invoice
-   QRIS
-   Dashboard
-   Webhook

## Phase 2

-   Multi-provider
-   Smart routing
-   Refund
-   Settlement

## Phase 3

-   Wallet
-   Split payment
-   Escrow
-   Subscription billing

## Phase 4

-   AI Fraud Detection
-   Multi-currency
-   Multi-country
-   SDK (Laravel, Go, Java, Node.js, Flutter)
-   Predictive analytics

------------------------------------------------------------------------

# Ecosystem Integration

``` text
SendaGo Identity
        │
SendaGo Payment
   ├── SendaGo Mail
   ├── SendaGo WA
   ├── SendaGo Push
   ├── SendaGo Analytics
   └── SendaGo Billing
```

Single Sign-On, unified API Keys, centralized billing, and one merchant
dashboard across the SendaGo ecosystem.
