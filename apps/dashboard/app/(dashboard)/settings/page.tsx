'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings,
  QrCode,
  Building2,
  Radio,
  Save,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Sparkles,
  Info,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Key,
  Lock,
  RefreshCw,
  X,
  Mail,
  Send,
  Server,
  Globe,
  Inbox,
  CheckCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api, EmailNotificationPreview } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { BankSelect } from '@/components/ui/bank-select';
import { formatDate } from '@/lib/utils';

import { auth } from '@/lib/auth';

export default function SettingsPage() {
  const { toast } = useToast();

  // Admin Profile State
  const [adminName, setAdminName] = useState('Aditya Putra');
  const [adminEmail, setAdminEmail] = useState('admin@sendago.pay');
  const [adminPassword, setAdminPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfileSuccess, setSavedProfileSuccess] = useState(false);

  const [masterQRIS, setMasterQRIS] = useState('');
  const [bankName, setBankName] = useState('BCA');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // 2FA Setup Modal State
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFAUrl, setTwoFAUrl] = useState('');
  const [twoFACodeInput, setTwoFACodeInput] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // SendagoMail Test Dispatcher State
  const [testEmailRecipient, setTestEmailRecipient] = useState('admin@sendago.pay');
  const [sendingTestMail, setSendingTestMail] = useState(false);
  const [testMailResult, setTestMailResult] = useState<EmailNotificationPreview | null>(null);
  const [showTestMailModal, setShowTestMailModal] = useState(false);

  // Confirm Modal State
  const [confirmDisable2FAOpen, setConfirmDisable2FAOpen] = useState(false);

  useEffect(() => {
    loadSettings();
    const currentUser = auth.getUser();
    if (currentUser) {
      if (currentUser.name) setAdminName(currentUser.name);
      if (currentUser.email) setAdminEmail(currentUser.email);
    }
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim()) {
      toast.warning('Data Tidak Lengkap', 'Nama dan email tidak boleh kosong.');
      return;
    }

    setSavingProfile(true);
    try {
      await api.updateProfile({
        name: adminName.trim(),
        email: adminEmail.trim(),
        password: adminPassword.trim() || undefined,
      });

      setSavedProfileSuccess(true);
      setAdminPassword('');
      toast.gold('Profil Diperbarui! 🌟', `Nama (${adminName}) & Email (${adminEmail}) berhasil disimpan.`);
      setTimeout(() => setSavedProfileSuccess(false), 3000);
    } catch (err: any) {
      toast.error('Gagal Menyimpan Profil', err.message || 'Terjadi kesalahan saat menyimpan profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data) {
        setMasterQRIS(data.master_qris || '');
        setBankName(data.bank_name || 'BCA');
        setBankAccountNumber(data.bank_account_number || '');
        setBankAccountName(data.bank_account_name || '');
        setIs2FAEnabled(data.is_2fa_enabled || false);
      }
    } catch (e) {
      console.error('Failed to load settings from API:', e);
    }
  };

  // Individual Section Saving States
  const [savingQRIS, setSavingQRIS] = useState(false);
  const [savedQRISSuccess, setSavedQRISSuccess] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [savedBankSuccess, setSavedBankSuccess] = useState(false);

  const handleSaveQRIS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterQRIS.trim()) {
      toast.warning('Payload Kosong', 'Master QRIS string tidak boleh kosong.');
      return;
    }
    setSavingQRIS(true);
    try {
      await api.updateSettings({ master_qris: masterQRIS.trim() });
      setSavedQRISSuccess(true);
      toast.gold('Master QRIS Disimpan! 🌟', 'Payload Master QRIS EMVCo berhasil diperbarui.');
      setTimeout(() => setSavedQRISSuccess(false), 3000);
    } catch (err: any) {
      toast.error('Gagal Menyimpan', err.message || 'Terjadi kesalahan saat menyimpan master QRIS');
    } finally {
      setSavingQRIS(false);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAccountNumber.trim() || !bankAccountName.trim()) {
      toast.warning('Data Tidak Lengkap', 'Nomor rekening dan nama pemilik rekening wajib diisi.');
      return;
    }
    setSavingBank(true);
    try {
      await api.updateSettings({
        bank_name: bankName,
        bank_account_number: bankAccountNumber.trim(),
        bank_account_name: bankAccountName.trim(),
      });
      setSavedBankSuccess(true);
      toast.gold('Rekening Bank Disimpan! 🏦', `Rekening ${bankName} - ${bankAccountNumber} (${bankAccountName}) berhasil disimpan.`);
      setTimeout(() => setSavedBankSuccess(false), 3000);
    } catch (err: any) {
      toast.error('Gagal Menyimpan', err.message || 'Terjadi kesalahan saat menyimpan rekening bank');
    } finally {
      setSavingBank(false);
    }
  };

  const getWebhookEndpointUrl = () => {
    const base = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':8000') : 'http://localhost:8000');
    return `${base.replace(/\/$/, '')}/v1/mutations/webhook`;
  };

  const copyMutationWebhook = () => {
    const webhookUrl = getWebhookEndpointUrl();
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    toast.gold('Disalin ke Clipboard ✨', 'Endpoint webhook mutasi bank berhasil disalin.');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // 2FA Handlers
  const start2FASetup = async () => {
    setTwoFALoading(true);
    setTwoFAError(null);
    try {
      const data = await api.setup2FA();
      setTwoFASecret(data.secret);
      setTwoFAUrl(data.otpauth_url || (data as any).qr_code_url || '');
      setShow2FAModal(true);
    } catch (err: any) {
      toast.error('Gagal Memulai 2FA', err.message || 'Terjadi kesalahan sistem');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleVerifyEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFACodeInput || twoFACodeInput.length < 6) return;

    setTwoFALoading(true);
    setTwoFAError(null);
    try {
      await api.verifyAndEnable2FA(twoFASecret, twoFACodeInput);
      setIs2FAEnabled(true);
      setShow2FAModal(false);
      setTwoFACodeInput('');
      toast.gold('2FA Berhasil Aktif! 🔒', 'Akun Anda kini terlindungi dengan verifikasi Google Authenticator.');
    } catch (err: any) {
      setTwoFAError(err.message || 'Kode verifikasi tidak valid.');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleConfirmDisable2FA = async () => {
    try {
      await api.disable2FA();
      setIs2FAEnabled(false);
      setConfirmDisable2FAOpen(false);
      toast.gold('2FA Dinonaktifkan', 'Proteksi Two-Factor Authentication telah dinonaktifkan.');
    } catch (err: any) {
      toast.error('Gagal Menonaktifkan', err.message || 'Terjadi kesalahan');
    }
  };

  const copy2FASecretKey = () => {
    navigator.clipboard.writeText(twoFASecret);
    setCopiedSecret(true);
    toast.gold('Secret Disalin ✨', 'Secret Key 2FA berhasil disalin.');
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  // SendagoMail Test Handler
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailRecipient) return;

    setSendingTestMail(true);
    try {
      const res = await api.sendTestEmail(testEmailRecipient);
      setTestMailResult(res.result);
      setShowTestMailModal(true);
      toast.gold(
        'Email Uji Coba Terkirim! 📧',
        `Notifikasi berhasil dikirim melalui mail server sendagomail.adilabs.id ke ${testEmailRecipient}.`
      );
    } catch (err: any) {
      toast.error('Gagal Mengirim Email', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSendingTestMail(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              Settings & Integrations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
              ⚡ Engine 2.0
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Konfigurasi profil administrator, keamanan 2FA, master QRIS statis, rekening bank penampung dana, dan mail engine SendagoMail.
          </p>
        </div>
      </div>

      {/* ADMIN PROFILE SECTION */}
      <div className="bg-white rounded-3xl p-6 border border-amber-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2 text-zinc-900">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center font-bold text-xs">
              {adminName ? adminName.substring(0, 2).toUpperCase() : 'AP'}
            </div>
            <div>
              <h2 className="font-bold text-sm">Profil Akun Administrator</h2>
              <p className="text-[11px] text-zinc-400">Ubah nama tampilan, alamat email, dan kata sandi login dashboard Anda.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                <span className="text-amber-600 font-bold">•</span>
                <span>Nama Lengkap Admin</span>
              </label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Contoh: Aditya Putra"
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                <span className="text-amber-600 font-bold">•</span>
                <span>Email Administrator</span>
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@sendago.pay"
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1 max-w-md">
            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Ganti Password Baru (Opsional)</span>
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Kosongkan jika tidak ingin mengubah password"
              className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-xl shadow-gold-sm transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Menyimpan...' : 'Simpan Profil Akun'}</span>
            </button>

            {savedProfileSuccess && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Profil & Email Berhasil Disimpan!</span>
              </span>
            )}
          </div>
        </form>
      </div>

      {/* 2FA SECURITY SECTION */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2 text-zinc-900">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-sm">Two-Factor Authentication (2FA)</h2>
          </div>

          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
              is2FAEnabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-stone-100 text-zinc-600 border-stone-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${is2FAEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
            <span>{is2FAEnabled ? '2FA AKTIF & DILINDUNGI' : '2FA NONAKTIF'}</span>
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-xs text-zinc-600 space-y-1 max-w-xl">
            <p className="font-semibold text-zinc-900">
              Lindungi Akun Dashboard Anda dengan TOTP (RFC 6238):
            </p>
            <p>
              Saat 2FA aktif, Anda akan diminta memasukkan 6 digit kode keamanan berbasis waktu dari <strong>Google Authenticator</strong> atau <strong>Authy</strong> setiap kali login.
            </p>
          </div>

          <div>
            {is2FAEnabled ? (
              <button
                type="button"
                onClick={() => setConfirmDisable2FAOpen(true)}
                className="px-4 py-2 text-xs font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition"
              >
                Nonaktifkan 2FA
              </button>
            ) : (
              <button
                type="button"
                onClick={start2FASetup}
                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-xl shadow-gold-sm transition flex items-center gap-1.5"
              >
                <Smartphone className="w-4 h-4" />
                <span>Aktifkan 2FA Sekarang</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SENDAGOMAIL ENGINE INTEGRATION CARD */}
      <div className="bg-white rounded-3xl p-6 border border-amber-200/90 shadow-2xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-zinc-900">
                  SendagoMail Engine (`sendagomail.adilabs.id`)
                </h2>
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>CONNECTED & OPERATIONAL</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Layanan pengiriman notifikasi email otomatis aplikasi: Tanda Terima Transaksi, Persetujuan API Key, Undangan Akun, & Peringatan Keamanan.
              </p>
            </div>
          </div>
        </div>

        {/* Gateway Specification Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
            <span className="text-[10px] text-zinc-400 font-semibold block">Mail Server Gateway</span>
            <div className="font-mono font-bold text-zinc-900 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-amber-600" />
              <span>sendagomail.adilabs.id</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-medium">DKIM & SPF Verified</span>
          </div>

          <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
            <span className="text-[10px] text-zinc-400 font-semibold block">Default Sender Identity</span>
            <div className="font-mono font-bold text-zinc-900 truncate">
              no-reply@sendagomail.adilabs.id
            </div>
            <span className="text-[10px] text-zinc-500">SendaGo Pay Mail Engine</span>
          </div>

          <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
            <span className="text-[10px] text-zinc-400 font-semibold block">Protokol & Keamanan</span>
            <div className="font-bold text-zinc-900 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>TLS 1.3 / HTTPS API</span>
            </div>
            <span className="text-[10px] text-zinc-500">Zero-bounce delivery</span>
          </div>

        </div>

        {/* Live Test Mail Dispatcher */}
        <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-zinc-900 text-xs">
              Uji Coba Pengiriman Email Notifikasi SendagoMail
            </h3>
          </div>

          <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="Masukkan email penerima (contoh: nama@domain.com)"
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-mono text-zinc-800"
              />
            </div>

            <button
              type="submit"
              disabled={sendingTestMail}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs shadow-gold-sm transition flex items-center justify-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingTestMail ? 'Mengirim via SendagoMail...' : 'Kirim Email Uji Coba'}</span>
            </button>
          </form>
        </div>

      </div>

      {/* INDEPENDENT CONFIGURATION SECTIONS */}
      <div className="space-y-6">
        
        {/* 1. MASTER QRIS CONFIGURATION CARD */}
        <form onSubmit={handleSaveQRIS} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-zinc-900">
              <QrCode className="w-5 h-5 text-amber-600" />
              <h2 className="font-bold text-sm">Konfigurasi Master QRIS Statis</h2>
            </div>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
              EMVCo Dynamic Engine
            </span>
          </div>

          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-600 space-y-1">
              <p className="font-bold text-zinc-900">
                Cara Kerja Dynamic QRIS Tanpa KYC Payment Gateway:
              </p>
              <p>
                Cukup paste string payload dari <strong>1 QRIS Statis Usaha / GoBiz / DANA Bisnis / Nobu / BCA Merchant Anda</strong> di bawah. SendaGo Engine akan membedah payload EMVCo, menyisipkan nominal pas secara otomatis (Tag 54), dan menghitung ulang checksum CRC16 (Tag 63).
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">
              Master QRIS Payload String (EMVCo)
            </label>
            <textarea
              rows={3}
              required
              value={masterQRIS}
              onChange={(e) => setMasterQRIS(e.target.value)}
              placeholder="00020101021126590013ID.CO.GOPAY.WWW..."
              className="w-full p-3 font-mono text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 text-zinc-800 leading-relaxed"
            />
            <p className="text-[11px] text-zinc-400">
              String ini diawali dengan `000201010211...` dan diakhiri dengan checksum 4 karakter (Tag 63).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-stone-100">
            <p className="text-[11px] text-zinc-400">
              Perubahan QRIS akan langsung aktif di simulasi & checkout API.
            </p>
            <button
              type="submit"
              disabled={savingQRIS}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs shadow-gold-sm transition flex items-center justify-center gap-1.5 shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingQRIS ? 'Menyimpan QRIS...' : savedQRISSuccess ? 'Master QRIS Tersimpan! ✓' : 'Simpan Master QRIS'}</span>
            </button>
          </div>
        </form>

        {/* 2. BANK ACCOUNT CONFIGURATION CARD */}
        <form onSubmit={handleSaveBank} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-zinc-900">
              <Building2 className="w-5 h-5 text-amber-600" />
              <h2 className="font-bold text-sm">Rekening Bank Penampung</h2>
            </div>
            <span className="text-[11px] font-semibold text-zinc-500 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">
              Transfer Manual & Mutasi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <BankSelect
              label="Nama Bank Penampung"
              value={bankName}
              onChange={(code) => setBankName(code)}
            />

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">
                Nomor Rekening
              </label>
              <input
                type="text"
                required
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="7311443927"
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-mono font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">
                Atas Nama (Nama Pemilik Rekening)
              </label>
              <input
                type="text"
                required
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="ADI SUMARDI"
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-medium uppercase"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-stone-100">
            <p className="text-[11px] text-zinc-400">
              Rekening ini akan ditampilkan sebagai tujuan transfer pada checkout halaman bayar.
            </p>
            <button
              type="submit"
              disabled={savingBank}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs shadow-gold-sm transition flex items-center justify-center gap-1.5 shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingBank ? 'Menyimpan Rekening...' : savedBankSuccess ? 'Rekening Tersimpan! ✓' : 'Simpan Rekening Bank'}</span>
            </button>
          </div>
        </form>

        {/* 3. BANK MUTATION WEBHOOK LISTENER CARD */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 border-b border-stone-100 pb-3">
            <Radio className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-sm">Inbound Bank Mutation Webhook Endpoint</h2>
          </div>

          <p className="text-xs text-zinc-500">
            Arahkan bot scraper mutasi bank / mutasi QRIS Anda ke URL endpoint berikut untuk rekonsiliasi otomatis:
          </p>

          <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
            <span className="font-mono text-xs text-zinc-800 truncate flex-1">
              {getWebhookEndpointUrl()}
            </span>
            <button
              type="button"
              onClick={copyMutationWebhook}
              className="text-amber-700 hover:text-amber-800 pl-2 font-semibold text-xs flex items-center gap-1"
            >
              {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedUrl ? 'Tersalin' : 'Salin URL'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* 2FA SETUP MODAL */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-amber-200 shadow-gold-lg space-y-5 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-zinc-900 text-sm">Setup Google Authenticator (2FA)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShow2FAModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {twoFAError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {twoFAError}
              </div>
            )}

            <div className="space-y-4 text-xs text-zinc-600">
              <p className="font-semibold text-zinc-800">
                1. Scan QR Code di bawah dengan aplikasi Google Authenticator / Authy:
              </p>

              {/* QR Code Container */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col items-center justify-center">
                {twoFAUrl ? (
                  <div className="bg-white p-3 rounded-xl border border-stone-100 shadow-2xs">
                    <QRCodeSVG value={twoFAUrl} size={160} level="M" />
                  </div>
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-zinc-800">
                  Atau masukkan Secret Key secara manual:
                </p>
                <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
                  <span className="font-mono text-xs text-amber-900 font-bold truncate flex-1 tracking-wider">
                    {twoFASecret}
                  </span>
                  <button
                    type="button"
                    onClick={copy2FASecretKey}
                    className="text-amber-700 hover:text-amber-800 pl-2 text-xs flex items-center gap-1"
                  >
                    {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSecret ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleVerifyEnable2FA} className="space-y-3 pt-2 border-t border-stone-100">
                <p className="font-semibold text-zinc-800">
                  2. Masukkan 6 digit kode yang tampil di Authenticator untuk mengaktifkan:
                </p>

                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={twoFACodeInput}
                  onChange={(e) => setTwoFACodeInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-2.5 text-center text-xl font-mono font-black tracking-widest bg-stone-50 border-2 border-amber-300 rounded-xl focus:outline-none focus:border-amber-500 text-zinc-900"
                />

                <div className="pt-2 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShow2FAModal(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-zinc-700 rounded-xl text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={twoFALoading || twoFACodeInput.length < 6}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-gold-sm transition"
                  >
                    {twoFALoading ? 'Memverifikasi...' : 'Verifikasi & Aktifkan'}
                  </button>
                </div>
              </form>

            </div>

          </div>
        </div>
      )}

      {/* SENDAGOMAIL TEST DISPATCH RESULT MODAL */}
      {showTestMailModal && testMailResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-amber-200 shadow-gold-lg space-y-4 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm">
                    Uji Coba SendagoMail Sukses! 📨
                  </h3>
                  <p className="text-[10px] text-emerald-700 font-semibold font-mono">
                    Gateway: {testMailResult.mail_server || 'sendagomail.adilabs.id'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTestMailModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Email Preview Details */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs space-y-3 font-sans">
              
              <div className="space-y-1.5 border-b border-stone-200 pb-3 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Mail Gateway:</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    sendagomail.adilabs.id
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Message-ID:</span>
                  <span className="font-mono text-zinc-600 text-[10px]">
                    {testMailResult.message_id}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Dari:</span>
                  <span className="font-semibold text-zinc-800">{testMailResult.sender}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Kepada:</span>
                  <span className="font-bold text-amber-900">{testMailResult.recipient}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Subjek:</span>
                  <span className="font-bold text-zinc-900">{testMailResult.subject}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Waktu Kirim:</span>
                  <span className="text-zinc-500 font-mono text-[10px]">{formatDate(testMailResult.sent_at)}</span>
                </div>
              </div>

              {/* Email Content Box */}
              <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 space-y-2 text-zinc-700 leading-relaxed text-xs">
                <div className="flex items-center gap-2 text-amber-800 font-black text-xs">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>SendaGo Pay Mail Engine</span>
                </div>
                <p>Halo Administrator,</p>
                <p>
                  Ini adalah konfirmasi bahwa koneksi Mail Engine Anda ke <strong>sendagomail.adilabs.id</strong> telah aktif dan terverifikasi secara penuh.
                </p>
                <div className="p-2 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg text-[10px] font-semibold">
                  ✅ Status: Terkirim & Siap Menerima Beban Notifikasi Transaksi
                </div>
              </div>

            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTestMailModal(false)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRM DISABLE 2FA MODAL */}
      <ConfirmModal
        isOpen={confirmDisable2FAOpen}
        onClose={() => setConfirmDisable2FAOpen(false)}
        onConfirm={handleConfirmDisable2FA}
        title="Nonaktifkan Two-Factor Authentication?"
        description="Akun Anda akan menjadi kurang aman tanpa proteksi kode 6 digit Google Authenticator saat login."
        confirmText="Ya, Nonaktifkan 2FA"
        cancelText="Batal"
        type="danger"
      />

    </div>
  );
}
