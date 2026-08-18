'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Eye,
  EyeOff,
  AlertCircle,
  QrCode,
  Zap,
  Building2,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { useToast } from '@/components/ui/toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2FA Step State
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);

  useEffect(() => {
    if (auth.isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleStep1Password = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Masukkan email dan password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(email.trim(), password);

      if (res.requires_2fa) {
        setRequires2FA(true);
        setTempToken(res.temp_token || null);
        toast.info('Verifikasi 2FA Diperlukan', 'Masukkan 6 digit kode dari Google Authenticator Anda.');
        setLoading(false);
        return;
      }

      if (res.token && res.user) {
        auth.setSession(res.token, res.user);
        toast.success('Login Berhasil!', `Selamat datang kembali, ${res.user.name}.`);
        router.push('/dashboard');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Login gagal. Periksa kembali email dan password Anda.';
      setError(errMsg);
      toast.error('Login Gagal', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2TOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.trim().length !== 6) {
      const msg = 'Masukkan 6 digit kode 2FA.';
      setError(msg);
      toast.warning('Input Tidak Lengkap', msg);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(email.trim(), password, totpCode.trim(), tempToken || undefined);

      if (res.token && res.user) {
        auth.setSession(res.token, res.user);
        toast.success('Verifikasi 2FA Sukses!', `Selamat datang kembali, ${res.user.name}.`);
        router.push('/dashboard');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Kode 2FA salah atau kadaluarsa. Coba lagi.';
      setError(errMsg);
      toast.error('Verifikasi 2FA Gagal', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4 sm:p-6 selection:bg-amber-100 font-sans">
      
      {/* Elevated Split Card Container (Matching SendagoMail & Sendago WA) */}
      <div className="max-w-4xl w-full bg-white rounded-3xl border border-amber-200/80 shadow-[0_10px_40px_rgba(217,119,6,0.08)] overflow-hidden grid grid-cols-1 md:grid-cols-2">
        
        {/* LEFT COLUMN: LOGIN FORM */}
        <div className="p-6 sm:p-10 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            
            {/* Top Brand Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/images/logo.png"
                  alt="SendaGo Pay"
                  className="w-10 h-10 object-contain rounded-xl shadow-2xs"
                />
                <div>
                  <div className="font-extrabold text-zinc-900 tracking-tight text-base leading-none">
                    SendaGo <span className="text-amber-600">Pay</span>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700/80 mt-0.5">
                    Payment Engine
                  </div>
                </div>
              </div>

              <Link
                href="/"
                className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 transition flex items-center gap-1"
              >
                <span>← Beranda</span>
              </Link>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-1 pt-2">
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
                {requires2FA ? 'Verifikasi 2FA' : 'Selamat datang kembali'}
              </h1>
              <p className="text-xs text-zinc-500">
                {requires2FA
                  ? 'Buka aplikasi Google Authenticator untuk verifikasi 6 digit kode.'
                  : 'Masuk untuk kelola payment gateway & mutasi bank Anda.'}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: EMAIL & PASSWORD */}
            {!requires2FA ? (
              <form onSubmit={handleStep1Password} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@domainanda.com"
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-zinc-700">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 karakter"
                      className="w-full pl-10 pr-10 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs shadow-gold-sm transition flex items-center justify-center gap-2 mt-2"
                >
                  <span>{loading ? 'Memverifikasi...' : 'Masuk →'}</span>
                </button>
              </form>
            ) : (
              
              /* STEP 2: TWO-FACTOR AUTHENTICATION (2FA) */
              <form onSubmit={handleStep2TOTP} className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 block">
                    6-Digit Authenticator Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full py-3 text-center text-2xl font-mono font-black tracking-widest bg-stone-50 border-2 border-amber-300 rounded-xl focus:outline-none focus:border-amber-500 text-zinc-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs shadow-gold-sm transition flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{loading ? 'Memverifikasi 2FA...' : 'Konfirmasi Masuk →'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRequires2FA(false);
                    setTotpCode('');
                  }}
                  className="w-full py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition text-center"
                >
                  ← Gunakan Akun Lain
                </button>
              </form>
            )}
          </div>

          {/* Bottom Footer Text */}
          <div className="text-center pt-4 border-t border-stone-100">
            <p className="text-xs text-zinc-500">
              Belum punya akses?{' '}
              <Link href="/" className="text-amber-700 font-bold hover:underline">
                Pelajari Paket
              </Link>
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: BRANDING & FEATURE SHOWCASE (Matching SendagoMail & Sendago WA) */}
        <div className="bg-gradient-to-br from-amber-700 via-amber-600 to-amber-800 text-white p-6 sm:p-10 flex flex-col justify-between space-y-8 relative overflow-hidden">
          
          {/* Subtle Background Glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-900/30 rounded-full blur-3xl pointer-events-none" />

          {/* Top Feature Badge */}
          <div className="space-y-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-6 h-6 text-amber-200" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black tracking-tight leading-tight">
                Keamanan Akun Tingkat Tinggi
              </h2>
              <p className="text-xs text-amber-100/80 leading-relaxed">
                Lindungi payment gateway dan data mutasi rekening bisnis Anda dengan Autentikasi Dua Faktor (2FA) Google Authenticator.
              </p>
            </div>
          </div>

          {/* Checklist Features */}
          <div className="space-y-3 relative z-10 text-xs text-amber-50 font-medium">
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </div>
              <span>Proteksi Google Authenticator TOTP (RFC 6238)</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </div>
              <span>QRIS Dinamis otomatis tanpa potongan fee 0%</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </div>
              <span>Rekonsiliasi mutasi bank BCA, Mandiri, BRI, BNI</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </div>
              <span>Kontrol penuh di server VPS Anda sendiri</span>
            </div>
          </div>

          {/* Bottom Security Pill */}
          <div className="pt-4 border-t border-white/10 relative z-10 flex items-center gap-2 text-[11px] text-amber-200/70">
            <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Terenkripsi 256-Bit • Self-Hosted Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
