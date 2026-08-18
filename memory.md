# SendaGo Pay 2.0 — Progress & Architecture Memory

## Visi & Pendekatan Produk
Payment Gateway & Engine Internal Mandiri (*Self-Hosted*) — dibuat untuk memproses pembayaran aplikasi-aplikasi pribadi/indie tanpa perlu legalitas PT/CV atau KYC rumit ala Midtrans/Xendit.

### Pendekatan Teknis
1. **Direct QRIS Dinamis (EMVCo Tag 54 + CRC16-CCITT)**:
   Mengubah QRIS statis merchant perorangan (GoBiz/DANA Bisnis/BCA/Nobu) menjadi QRIS dinamis ber-nominal otomatis secara instan.
2. **Transfer Bank + 3-Digit Unique Code**:
   Alokasi kode unik acak (100–999) yang di-lock di Redis/Memory selama 30 menit.
3. **Inbound Bank Mutation Reconciler**:
   Endpoint `/v1/mutations/webhook` yang mencocokkan nominal uang masuk ke transaksi `PENDING` dan seketika menandainya sebagai `PAID`.
4. **Real-time Checkout Page (`/pay/:id`)**:
   Halaman checkout publik dengan Server-Sent Events (SSE) yang otomatis mendeteksi pembayaran masuk secara live.
5. **Outbound HMAC Webhook Dispatcher**:
   Pengiriman event `payment.success` ke server aplikasi klien dengan signature HMAC-SHA256 dan auto-retry backoff.

---

## Status Komponen SendaGo Pay 2.0

| Komponen | Stack | Status |
|---|---|---|
| **Go Backend Core** | Go 1.25, Gin, sqlx, redis, jwt | ✅ Full & Unit Tested (QRIS CRC16, Unique Code, Handlers) |
| **Database Schema** | PostgreSQL 16 (`infra/schema.sql`) | ✅ Full (merchants, apps, transactions, bank_mutations, webhook_logs) |
| **Cache & Lock** | Redis 7 (`internal/redis/`) | ✅ Full dengan graceful memory fallback |
| **Next.js Dashboard & Checkout** | Next.js 14, Tailwind, Lucide | ✅ Full & Compiled (`/`, `/apps`, `/transactions`, `/settings`, `/pay/:id`) |
| **Theme / Design** | Luxury Clean White & Champagne Gold | ✅ Full (Custom tokens, gradients, badges, and glow) |
| **Docker Compose** | `infra/docker-compose.yml` | ✅ Full (Postgres + Redis + Go Backend + Next.js Dashboard) |
