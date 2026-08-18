'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Check,
  QrCode,
  Building2,
  Lock,
  Layers,
  Sparkles,
  Server,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  CreditCard,
  Receipt,
  Headphones,
} from 'lucide-react';
import { auth } from '@/lib/auth';

export default function LandingPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    setIsAuth(auth.isAuthenticated());
  }, []);

  const slides = [
    {
      badge: '💳 Self-Hosted Payment Engine 2.0',
      title: 'Payment Gateway Tanpa Potongan Fee',
      subtitle: 'Terima pembayaran QRIS real-time, rekonsiliasi mutasi bank otomatis, dan webhook instan — semua di infrastruktur server Anda sendiri.',
    },
    {
      badge: '⚡ Dynamic QRIS Generator',
      title: 'QRIS Dinamis Otomatis Nominal Pas',
      subtitle: 'Inject Tag 54 secara presisi ke QRIS statis toko Anda sehingga pelanggan tidak perlu input manual dan langsung lunas.',
    },
    {
      badge: '🏦 Bank Mutation Reconciler',
      title: 'Rekonsiliasi Mutasi Bank Otomatis',
      subtitle: 'Pencocokan 3-digit kode unik instan untuk BCA, Mandiri, BRI, BNI tanpa perlu repot cek mutasi m-Banking satu per satu.',
    },
    {
      badge: '🚀 Developer-First API',
      title: 'REST API Terenkripsi & Webhook Real-Time',
      subtitle: 'Integrasikan checkout ke website SaaS, toko online, Flutter mobile app, dan sistem kasir Anda dalam hitungan menit.',
    },
  ];

  // Auto advance slides every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="min-h-screen bg-stone-50/60 text-zinc-900 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900 font-sans">
      
      {/* 1. TOP MARQUEE TICKER (Matching sendagomail & sendago) */}
      <div className="bg-[#B91C1C] text-white py-2 px-4 text-xs font-semibold overflow-hidden whitespace-nowrap shadow-xs relative z-50">
        <div className="inline-flex items-center gap-8 animate-marquee">
          <span className="flex items-center gap-1.5">
            <span>🔥</span> Self-hosted, kontrol penuh tanpa potongan fee per transaksi
          </span>
          <span className="flex items-center gap-1.5">
            <span>💳</span> QRIS Dinamis otomatis (Tag 54 nominal pas)
          </span>
          <span className="flex items-center gap-1.5">
            <span>⚡</span> Rekonsiliasi mutasi bank otomatis (BCA, Mandiri, BRI, BNI)
          </span>
          <span className="flex items-center gap-1.5">
            <span>🛡️</span> Two-Factor Authentication (2FA TOTP RFC 6238)
          </span>
          <span className="flex items-center gap-1.5">
            <span>🤖</span> Webhook dispatcher instan & REST API transaksional
          </span>
          <span className="flex items-center gap-1.5">
            <span>🔥</span> Self-hosted, kontrol penuh tanpa potongan fee per transaksi
          </span>
          <span className="flex items-center gap-1.5">
            <span>💳</span> QRIS Dinamis otomatis (Tag 54 nominal pas)
          </span>
        </div>
      </div>

      {/* 2. TOP NAVBAR */}
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200/80 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/images/logo.png"
              alt="SendaGo Pay"
              className="w-9 h-9 object-contain rounded-xl shadow-xs group-hover:scale-105 transition-transform duration-200"
            />
            <span className="text-lg font-black tracking-tight text-zinc-900">
              SendaGo <span className="text-[#B91C1C]">Pay</span>
            </span>
          </Link>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs sm:text-sm font-bold text-zinc-700 hover:text-zinc-900 hover:bg-stone-100/80 rounded-xl transition"
            >
              Login
            </Link>

            {isAuth ? (
              <Link
                href="/dashboard"
                className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <span>Buka Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl shadow-xs transition"
              >
                Daftar Gratis
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 3. HERO & SLIDER SECTION */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-16 flex-1 w-full space-y-12 sm:space-y-14">
        
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          {/* Floating Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-50 text-[#B91C1C] border border-red-200/80 text-xs font-bold shadow-2xs animate-in fade-in">
            <span>{slides[currentSlide].badge}</span>
          </div>

          {/* Dynamic Hero Title */}
          <h1 className="text-3xl sm:text-5xl font-black text-zinc-900 tracking-tight leading-[1.15] transition-all duration-300">
            {slides[currentSlide].title}
          </h1>

          {/* Dynamic Hero Subtitle */}
          <p className="text-sm sm:text-base text-zinc-600 max-w-2xl mx-auto leading-relaxed transition-all duration-300">
            {slides[currentSlide].subtitle}
          </p>

          {/* Carousel Dots */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`transition-all duration-300 rounded-full ${
                  currentSlide === idx
                    ? 'w-6 h-2 bg-[#B91C1C]'
                    : 'w-2 h-2 bg-stone-300 hover:bg-stone-400'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* 4. TWO PRICING / PLAN CARDS (Matching user screenshot) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
          
          {/* CARD 1: PAKET COBA */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              
              {/* Header Badge */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-black text-lg">
                  💳
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-900 leading-tight">
                    Paket Coba
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    Cara termurah untuk mencoba semua fitur
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                1 akun merchant mandiri, QRIS Dinamis tanpa potongan fee per transaksi, simulator mutasi bank, dan akses penuh ke Dashboard, Transaksi, API Keys, dan Webhook Dispatcher.
              </p>

              {/* Feature Checklist */}
              <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-zinc-700 font-medium">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
                  <span>QRIS Dinamis otomatis (Tag 54 nominal pas)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
                  <span>Rekonsiliasi mutasi bank otomatis (BCA, Mandiri, BRI, BNI)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
                  <span>REST API & Webhook notifikasi real-time</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
                  <span>Akses penuh Dashboard, API Keys, dan Tim 2FA</span>
                </li>
              </ul>
            </div>

            {/* Price & CTA Button */}
            <div className="space-y-4 pt-4 border-t border-stone-100">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-[#B91C1C] tracking-tight">
                  Rp 149.000
                </div>
                <div className="text-xs text-zinc-400 font-medium">
                  Sekali bayar
                </div>
              </div>

              <a
                href="https://wa.me/628123456789?text=Halo%20saya%20tertarik%20mencoba%20Paket%20Coba%20SendaGo%20Pay"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-2xl font-bold text-xs sm:text-sm text-center shadow-xs transition block"
              >
                Hubungi Kami
              </a>
            </div>
          </div>

          {/* CARD 2: PAKET PASANGIN */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              
              {/* Header Badge */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-black text-lg">
                  🖥️
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-900 leading-tight">
                    Paket Pasangin
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    Kami setup semuanya untuk Anda
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Deployment SendaGo Pay khusus (self-hosted) yang kami siapkan end-to-end langsung di VPS Linux server bisnis Anda.
              </p>

              {/* Feature Checklist */}
              <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-zinc-700 font-medium">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
                  <span>Gratis server VPS Linux & domain khusus selama 1 tahun</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
                  <span>Setup PostgreSQL, Go Engine & Next.js Dashboard siap pakai</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
                  <span>Integrasi Master QRIS statis & Rekening Bank bisnis Anda</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
                  <span>Kuota API production disesuaikan kebutuhan tanpa limit</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
                  <span>Pendampingan integrasi API pertama + support prioritas 24/7</span>
                </li>
              </ul>
            </div>

            {/* Price & CTA Button */}
            <div className="space-y-4 pt-4 border-t border-stone-100">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-[#B91C1C] tracking-tight">
                  Rp 4.999.000
                </div>
                <div className="text-xs text-zinc-400 font-medium">
                  Sekali bayar
                </div>
              </div>

              <a
                href="https://wa.me/628123456789?text=Halo%20saya%20tertarik%20Paket%20Pasangin%20SendaGo%20Pay"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-2xl font-bold text-xs sm:text-sm text-center shadow-xs transition block"
              >
                Hubungi Kami
              </a>
            </div>
          </div>
        </div>

        {/* 5. BOTTOM PILL FEATURE BAR (Matching screenshot bottom bar) */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-6 text-xs text-zinc-500 font-semibold border-t border-stone-200/60">
          <div className="flex items-center gap-1.5">
            <QrCode className="w-4 h-4 text-[#B91C1C]" />
            <span>QRIS Dinamis 0% Fee</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#B91C1C]" />
            <span>Rekonsiliasi Mutasi Otomatis</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#B91C1C]" />
            <span>2FA RFC 6238 Terenkripsi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#B91C1C]" />
            <span>Webhook & REST API Instan</span>
          </div>
        </div>
      </main>

      {/* 6. FOOTER */}
      <footer className="bg-white border-t border-stone-200/80 py-6 px-4 text-center text-xs text-zinc-400 space-y-2">
        <p className="font-medium text-zinc-500">
          © {new Date().getFullYear()} SendaGo Pay — Payment Gateway & Engine Platform. All rights reserved.
        </p>
        <p className="text-[11px] text-zinc-400">
          Bagian dari ekosistem SendaGo Suite • Powered by AdiLabs
        </p>
      </footer>
    </div>
  );
}
