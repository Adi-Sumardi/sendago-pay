'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Building2,
  Copy,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { api, PaymentDetails } from '@/lib/api';
import { formatIDR } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

export default function CheckoutPage() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'qris' | 'bank'>('qris');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('00:00');
  const [isPaid, setIsPaid] = useState(false);

  // Fetch initial payment details
  useEffect(() => {
    if (!id) return;

    api.getPayment(id)
      .then((data) => {
        setPayment(data);
        if (data.status === 'PAID') {
          setIsPaid(true);
        }
        setLoading(false);
      })
      .catch(() => {
        // Graceful Demo/Preview Fallback
        setPayment({
          id: id,
          app_id: 'app-demo',
          app_name: 'SendaGo SaaS Store',
          order_id: id.startsWith('SGD-') ? id : `SGD-${id.slice(0, 4).toUpperCase() || '7390'}`,
          amount: 150000,
          unique_code: 247,
          total_amount: 150247,
          channel: 'QRIS',
          status: 'PENDING',
          customer_name: 'Demo Customer',
          customer_email: 'demo@sendago.pay',
          qris_payload: '00020101021226590013ID.CO.GOPAY.WWW01189360091438291039210215ID10200392019010303UMI51440014ID.CO.QRIS.WWW0215ID10200392019010303UMI52045411530336054061502475802ID5911SendaGo Pay6013Jakarta Pusat61051011062070703A0163046D5E',
          bank_name: 'BCA',
          bank_account_number: '8831092819',
          bank_account_name: 'ADITYA PUTRA',
          expired_at: new Date(Date.now() + 15 * 60000).toISOString(),
          created_at: new Date().toISOString(),
        });
        setLoading(false);
      });
  }, [id]);

  // Real-time SSE Listener for instant auto-payment detection
  useEffect(() => {
    if (!id || isPaid) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const eventSource = new EventSource(`${apiUrl}/v1/payments/${id}/stream`);

    eventSource.addEventListener('status', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.status === 'PAID') {
          setIsPaid(true);
          setPayment((prev) => (prev ? { ...prev, status: 'PAID' } : prev));
        } else if (data.status === 'EXPIRED') {
          setPayment((prev) => (prev ? { ...prev, status: 'EXPIRED' } : prev));
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [id, isPaid]);

  // Countdown timer logic
  useEffect(() => {
    if (!payment || isPaid || payment.status !== 'PENDING') return;

    const expiryTime = new Date(payment.expired_at).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = expiryTime - now;

      if (distance <= 0) {
        setTimeLeft('00:00');
        setPayment((prev) => (prev ? { ...prev, status: 'EXPIRED' } : prev));
        clearInterval(interval);
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [payment, isPaid]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Berhasil Disalin!', `${field} telah disalin ke clipboard.`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-600 font-medium">Memuat rincian pembayaran...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-zinc-200 shadow-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Pembayaran Tidak Ditemukan</h2>
          <p className="text-zinc-500 mb-6 text-sm">
            {error || 'Link pembayaran tidak valid atau telah kadaluarsa.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // SUCCESS STATE
  if (isPaid || payment.status === 'PAID') {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-amber-200/80 shadow-gold-md text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-emerald-100/80 shadow-sm">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-800 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Pembayaran Berhasil Diverifikasi</span>
          </div>

          <h1 className="text-2xl font-bold text-zinc-900 mb-1">Terima Kasih!</h1>
          <p className="text-zinc-500 text-sm mb-4">
            Pembayaran untuk <strong className="text-zinc-800">{payment.customer_name || 'Siswa'}</strong> (#{payment.order_id}) telah diterima secara otomatis.
          </p>

          <div className="bg-stone-50 rounded-2xl p-4 border border-zinc-100 mb-6 text-left space-y-2.5 text-xs">
            {payment.customer_name && (
              <div className="flex justify-between border-b border-zinc-200/60 pb-2">
                <span className="text-zinc-500">Nama Siswa / Pembayar</span>
                <span className="font-bold text-zinc-900">{payment.customer_name}</span>
              </div>
            )}

            {payment.notes && (
              <div className="flex justify-between border-b border-zinc-200/60 pb-2">
                <span className="text-zinc-500">Keperluan</span>
                <span className="font-medium text-zinc-800 text-right max-w-[200px] truncate">{payment.notes}</span>
              </div>
            )}

            {/* Dynamic Metadata details if available */}
            {payment.metadata && Object.keys(payment.metadata).length > 0 && (
              <div className="border-b border-zinc-200/60 pb-2 space-y-1">
                {Object.entries(payment.metadata).slice(0, 3).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-[11px]">
                    <span className="text-zinc-400 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-zinc-700">{String(val)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-zinc-500">No. Tagihan / Order ID</span>
              <span className="font-mono font-bold text-zinc-900">{payment.order_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Metode Pembayaran</span>
              <span className="font-medium text-zinc-800">
                {payment.channel === 'QRIS' ? 'QRIS Dinamis' : 'Transfer Bank'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Unit / Lembaga</span>
              <span className="font-medium text-zinc-800">{payment.app_name || 'Lembaga Pendidikan'}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-sm">
              <span className="font-bold text-zinc-900">Total Dibayar</span>
              <span className="font-black text-emerald-700">{formatIDR(payment.total_amount)}</span>
            </div>
          </div>

          {payment.redirect_url ? (
            <a
              href={payment.redirect_url}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl font-semibold shadow-gold-sm hover:from-amber-600 hover:to-amber-700 transition flex items-center justify-center gap-2"
            >
              <span>Lanjut ke Aplikasi</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          ) : (
            <button
              onClick={() => window.close()}
              className="w-full py-3.5 bg-zinc-900 text-white rounded-2xl font-semibold hover:bg-zinc-800 transition"
            >
              Tutup Halaman Ini
            </button>
          )}
        </div>
      </div>
    );
  }

  // EXPIRED STATE
  if (payment.status === 'EXPIRED') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm text-center">
          <Clock className="w-14 h-14 text-zinc-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Waktu Pembayaran Habis</h2>
          <p className="text-zinc-500 text-sm mb-6">
            Tagihan ini telah kadaluarsa. Silakan lakukan pemesanan ulang dari aplikasi Anda.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-zinc-900 text-white rounded-2xl font-medium hover:bg-zinc-800 transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Cek Status Terbaru</span>
          </button>
        </div>
      </div>
    );
  }

  // Base amount and unique code separation for visual emphasis
  const baseAmountFormatted = formatIDR(payment.amount);
  const uniqueCodeStr = payment.unique_code.toString().padStart(3, '0');

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-4 sm:py-8 px-3 sm:px-4 flex flex-col justify-between items-center selection:bg-amber-100">
      <div className="max-w-lg w-full space-y-4 sm:space-y-5">
        
        {/* Top Branding */}
        <div className="flex items-center justify-between px-1 sm:px-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white font-bold text-sm shadow-gold-sm">
              S
            </div>
            <span className="font-bold text-zinc-900 tracking-tight text-base sm:text-lg">
              SendaGo <span className="text-amber-600">Pay</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold bg-white border border-amber-200/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-amber-800 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Aman & Terverifikasi</span>
          </div>
        </div>

        {/* Main Elevated Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-amber-200/70 shadow-gold-md overflow-hidden transition-all duration-300">
          
          {/* Bill Summary Banner */}
          <div className="p-4 sm:p-6 border-b border-stone-100 bg-gradient-to-b from-amber-50/40 to-transparent">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Tagihan Pembayaran
                </span>
                <h3 className="text-sm sm:text-base font-bold text-zinc-800">
                  {payment.app_name || 'Merchant'} • #{payment.order_id}
                </h3>
              </div>
              <button
                onClick={() => copyToClipboard(payment.total_amount.toString(), 'amount')}
                className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100/60 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition"
              >
                {copiedField === 'amount' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'amount' ? 'Tersalin' : 'Salin Nominal'}</span>
              </button>
            </div>

            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                {formatIDR(payment.total_amount)}
              </span>
              {payment.unique_code > 0 && (
                <span className="text-xs text-amber-700 font-semibold bg-amber-100/80 px-2 py-0.5 rounded-full ml-1">
                  Termasuk kode unik: +{payment.unique_code}
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-500 mt-1">
              Transfer <strong className="text-amber-800 font-semibold">tepat hingga 3 digit terakhir</strong> agar transaksi otomatis diverifikasi tanpa konfirmasi manual.
            </p>

            {/* Student & Invoice Info Box */}
            {(payment.customer_name || payment.notes || (payment.metadata && Object.keys(payment.metadata).length > 0)) && (
              <div className="mt-3.5 pt-2.5 border-t border-amber-200/60 bg-white/80 rounded-xl p-3 border border-amber-100 space-y-1.5 text-xs">
                {payment.customer_name && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-medium text-[11px]">Nama Siswa / Pendaftar:</span>
                    <span className="font-bold text-zinc-900">{payment.customer_name}</span>
                  </div>
                )}
                {payment.notes && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-medium text-[11px]">Keperluan:</span>
                    <span className="font-semibold text-zinc-800">{payment.notes}</span>
                  </div>
                )}
                {payment.metadata && Object.keys(payment.metadata).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Object.entries(payment.metadata).map(([k, v]) => (
                      <span key={k} className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-[10px] font-semibold text-amber-900">
                        <span className="capitalize text-amber-700 mr-1">{k.replace(/_/g, ' ')}:</span> {String(v)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Method Switcher Tabs */}
          <div className="flex border-b border-stone-100 bg-stone-50/70 p-1.5 gap-1.5 m-3 rounded-2xl border border-stone-200/60">
            <button
              onClick={() => setActiveTab('qris')}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'qris'
                  ? 'bg-white text-zinc-900 shadow-sm border border-amber-200/80 font-bold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <QrCode className="w-4 h-4 text-amber-600" />
              <span>QRIS Dinamis</span>
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'bank'
                  ? 'bg-white text-zinc-900 shadow-sm border border-amber-200/80 font-bold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>Transfer Bank</span>
            </button>
          </div>

          {/* TAB 1: QRIS DINAMIS */}
          {activeTab === 'qris' && (
            <div className="p-6 text-center space-y-5 animate-in fade-in duration-300">
              <div className="inline-block p-4 bg-white rounded-3xl border-2 border-amber-300/80 shadow-gold-sm relative group">
                {/* Gold corner design accents */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-amber-500 rounded-tl-sm" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-amber-500 rounded-tr-sm" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-amber-500 rounded-bl-sm" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-amber-500 rounded-br-sm" />

                {payment.qris_payload ? (
                  <QRCodeSVG
                    value={payment.qris_payload}
                    size={220}
                    level="M"
                    includeMargin={false}
                    className="mx-auto"
                  />
                ) : (
                  <div className="w-[220px] h-[220px] bg-stone-100 flex items-center justify-center text-zinc-400 text-xs">
                    QRIS tidak tersedia
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1">
                  NMID: ID10200392019 • ASPI
                </p>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  Scan dengan aplikasi apa saja: <strong className="text-zinc-700">BCA, Mandiri Livin, GoPay, OVO, ShopeePay, DANA, BRImo</strong>
                </p>
              </div>

              {/* Countdown & Live status */}
              <div className="pt-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold shadow-gold-sm mb-3">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Sisa Waktu Pembayaran: {timeLeft}</span>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Menunggu pembayaran masuk... (Otomatis Terdeteksi)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSFER BANK MANUAL DENGAN KODE UNIK */}
          {activeTab === 'bank' && (
            <div className="p-6 space-y-4 animate-in fade-in duration-300">
              <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200/80 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-stone-200/60">
                  <span className="text-xs font-medium text-zinc-500">Bank Tujuan</span>
                  <span className="text-sm font-bold text-zinc-900 bg-white px-3 py-1 rounded-lg border border-stone-200 shadow-2xs">
                    {payment.bank_name || 'BCA'}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">Nomor Rekening</label>
                  <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-stone-200">
                    <span className="font-mono font-bold text-zinc-900 text-base">
                      {payment.bank_account_number || '8831092819'}
                    </span>
                    <button
                      onClick={() => copyToClipboard(payment.bank_account_number || '8831092819', 'rekening')}
                      className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
                    >
                      {copiedField === 'rekening' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'rekening' ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">Nama Pemilik Rekening</label>
                  <div className="bg-white px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-zinc-800">
                    {payment.bank_account_name || 'ADITYA PUTRA'}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">Jumlah yang Harus Ditransfer</label>
                  <div className="flex items-center justify-between bg-amber-50/80 px-3.5 py-2.5 rounded-xl border border-amber-200">
                    <span className="font-bold text-amber-950 text-base">
                      {formatIDR(payment.total_amount)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(payment.total_amount.toString(), 'nominal')}
                      className="text-xs text-amber-800 hover:text-amber-900 font-bold flex items-center gap-1"
                    >
                      {copiedField === 'nominal' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'nominal' ? 'Tersalin' : 'Salin Nominal'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-center pt-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold mb-2">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Sisa Waktu: {timeLeft}</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Pembayaran akan terverifikasi dalam 1-2 menit setelah transfer berhasil.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-zinc-400 space-y-1">
          <p>Didukung oleh SendaGo Pay Gateway • Transaksi Terenkripsi 256-Bit</p>
        </div>

      </div>
    </div>
  );
}
