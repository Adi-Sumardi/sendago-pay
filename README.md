# SendaGo Pay 2.0 ⚡

**Self-Hosted Internal Payment Gateway & Engine** dirancang khusus untuk pengembang/kreator aplikasi di Indonesia yang ingin menerima pembayaran otomatis (QRIS Dinamis & Transfer Bank) tanpa terbebani verifikasi legalitas PT/CV atau KYC rumit ala Midtrans/Xendit.

---

## ✨ Fitur Utama

- **Direct Dynamic QRIS (EMVCo Tag 54 + CRC16-CCITT)**: Mengubah 1 QRIS statis merchant perorangan (GoBiz/DANA Bisnis/BCA/Nobu) menjadi QRIS dinamis ber-nominal pas secara instan.
- **Transfer Bank + Smart 3-Digit Unique Code**: Alokasi kode unik acak (100–999) dengan *revolving reservation pool* di Redis dan auto-expire.
- **Two-Factor Authentication (2FA / RFC 6238 TOTP)**: Keamanan login akun dengan Google Authenticator / Authy.
- **Inbound Bank Mutation Reconciler**: Endpoint siap pakai untuk menangkap data uang masuk dari bank/QRIS dan mencocokkannya ke transaksi `PENDING`.
- **Real-time Checkout Page (`/pay/:id`)**: Halaman bayar interaktif dengan Server-Sent Events (SSE) yang otomatis mendeteksi ketika pembayaran lunas tanpa refresh browser.
- **Multi-App Tenant & API Key Auth**: Kelola banyak aplikasi dengan Public Key (`sg_live_pk_...`), Secret Key (`sg_live_sk_...`), dan Webhook Signing Secret (`whsec_...`).
- **HMAC-SHA256 Signed Outbound Webhooks**: Notifikasi aman ke server aplikasi Anda dengan auto-retry.
- **Luxury White & Champagne Gold Dashboard**: UI modern berbasis **Next.js 14 + Tailwind CSS + shadcn/ui**.

---

## 🛠️ Tech Stack

- **Core Backend**: Go (Golang) Modular Monolith (`backend/`)
- **Database**: PostgreSQL 16 (`infra/schema.sql`)
- **Cache & Locks**: Redis 7
- **Frontend Dashboard & Checkout**: Next.js 14 (App Router) + Tailwind CSS + Lucide Icons
- **Deployment**: Single `docker-compose.yml`

---

## 🚀 Cara Menjalankan

### 1. Salin Environment
```bash
cp .env.example .env
```

### 2. Jalankan via Docker Compose
```bash
npm run dev
# atau: docker compose --env-file .env -f infra/docker-compose.yml up --build
```

### 3. Akses Layanan
- **Merchant Dashboard**: `http://localhost:3000`
- **Public Checkout Page**: `http://localhost:3000/pay/:id`
- **Go Backend API**: `http://localhost:8000`
- **Health Check**: `http://localhost:8000/healthz`

---

## 🔌 Cara Integrasi dari Aplikasi Klien

### 1. Buat Transaksi Baru (`POST /v1/payments`)
```bash
curl -X POST http://localhost:8000/v1/payments \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sg_live_sk_YOUR_SECRET_KEY" \
  -d '{
    "order_id": "ORDER-9921",
    "amount": 150000,
    "customer_name": "Budi Santoso",
    "customer_email": "budi@gmail.com",
    "redirect_url": "https://myapp.com/dashboard/orders/9921",
    "expiry_minutes": 30
  }'
```

**Response:**
```json
{
  "id": "7b8e1f2a-3c4d-4e5f-a6b7-c8d9e0f1a2b3",
  "order_id": "ORDER-9921",
  "amount": 150000,
  "unique_code": 247,
  "total_amount": 150247,
  "status": "PENDING",
  "checkout_url": "http://localhost:3000/pay/7b8e1f2a-3c4d-4e5f-a6b7-c8d9e0f1a2b3",
  "qris_payload": "000201010212...5406150247...630488F2"
}
```

### 2. Menerima Webhook di Server Aplikasi Anda
Ketika pembayaran berhasil diverifikasi, SendaGo Pay akan mengirim `POST` ke `webhook_url` Anda:

**Header:**
- `X-Sendago-Signature`: HMAC-SHA256 signature
- `X-Sendago-Event`: `payment.success`

**Body:**
```json
{
  "event": "payment.success",
  "transaction_id": "7b8e1f2a-3c4d-4e5f-a6b7-c8d9e0f1a2b3",
  "order_id": "ORDER-9921",
  "amount": 150000,
  "unique_code": 247,
  "total_amount": 150247,
  "status": "PAID",
  "channel": "QRIS",
  "paid_at": "2026-08-18T08:00:00Z"
}
```
