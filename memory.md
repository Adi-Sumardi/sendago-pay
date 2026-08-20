# SendaGo Pay 2.0 — Progress & Architecture Memory

## Visi & Pendekatan Produk
Payment Gateway & Engine Internal Mandiri (*Self-Hosted*) — dibuat untuk memproses pembayaran aplikasi indie, SaaS, serta sistem **Pendidikan / PPDB / PMB / SIAKAD (Kelompok Bermain s/d SMA & Kampus)** tanpa beban legalitas rumit atau potongan fee per transaksi yang mahal.

### Pendekatan Teknis & Fitur Inti
1. **Direct Dynamic QRIS (EMVCo Tag 54 + CRC16-CCITT)**:
   Mengubah QRIS statis merchant perorangan/sekolah (GoBiz/DANA Bisnis/BCA/Nobu/BSI) menjadi QRIS dinamis ber-nominal otomatis secara instan.
2. **Transfer Bank + Multi-Phase Smart Unique Code**:
   Alokasi kode unik acak 3 digit (`100..999`) dan auto-ekspansi ke 4 digit (`1000..9999`) saat traffic padat dengan *revolving reservation pool* di Redis/Memory. Mencegah kolisi nominal kembar.
3. **Idempotent Inbound Bank Mutation Reconciler**:
   Endpoint `/v1/mutations/webhook` dengan *Database Transaction Locking* (`BEGIN...COMMIT`) untuk mencocokkan mutasi masuk ke transaksi `PENDING` dan seketika menandainya sebagai `PAID` tanpa risiko race condition.
4. **Dukungan Metadata Dinamis (PMB & SIAKAD)**:
   Kolom `metadata JSONB/TEXT` yang fleksibel untuk menyimpan jenjang sekolah (`KB`, `TK`, `SD`, `SMP`, `SMA`, `SMK`), nama siswa, nomor pendaftaran, gelombang, prodi/kelas, dan otomatis diteruskan ke payload webhook.
5. **Real-time Checkout Page (`/pay/:id`)**:
   Halaman bayar interaktif dengan Server-Sent Events (SSE) yang menampilkan informasi lengkap siswa, nomor tagihan, opsi QRIS / Transfer Bank, dan kwitansi lunas otomatis.
6. **Outbound HMAC Webhook Dispatcher & Resend Feature**:
   Pengiriman event `payment.success` dengan HMAC-SHA256 signature, auto-retry backoff, dan fitur tombol **Kirim Ulang Webhook** di Dashboard.
7. **Two-Factor Authentication (2FA TOTP / RFC 6238)** & **Role-Based Access Control (RBAC)**.

---

## Status Komponen SendaGo Pay 2.0

| Komponen | Stack | Status |
|---|---|---|
| **Go Backend Core** | Go 1.25, Gin, sqlx, redis, jwt | ✅ 100% Tested (`go test -count=1 ./...` PASS) |
| **Database Schema** | PostgreSQL 16 & SQLite (`infra/schema.sql`, `database.go`) | ✅ Full + Dynamic Metadata JSONB & GIN Indexes |
| **Concurrency & Unique Code** | Redis 7 (`internal/uniquecode/`) | ✅ Full Multi-Phase Pool & Strict Collision Handling |
| **Next.js Dashboard & Checkout** | Next.js 14, Tailwind CSS, Lucide | ✅ 100% Compiled (`npm run build` PASS) |
| **Theme / Design** | Luxury Clean White & Champagne Gold | ✅ Full (Custom tokens, gradients, badges, and glow) |
| **Docker Compose** | `infra/docker-compose.yml` | ✅ Full (Postgres + Redis + Go Backend + Next.js Dashboard) |
