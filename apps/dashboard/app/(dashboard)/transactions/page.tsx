'use client';

import React, { useEffect, useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import { api, PaymentDetails } from '@/lib/api';
import { formatIDR, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export default function TransactionsPage() {
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<PaymentDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTx, setSelectedTx] = useState<PaymentDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmReconcileOpen, setConfirmReconcileOpen] = useState(false);
  const [reconcileTxId, setReconcileTxId] = useState<string | null>(null);

  useEffect(() => {
    loadTransactions();
  }, [statusFilter]);

  const loadTransactions = async (isManual = false) => {
    setLoading(true);
    try {
      const data = await api.getTransactions(statusFilter);
      setTransactions(data);
      if (isManual) toast.gold('Transaksi Diperbarui', 'Daftar riwayat transaksi telah diperbarui.');
    } catch (err) {
      console.error(err);
      if (isManual) toast.error('Gagal Memuat Transaksi', 'Koneksi ke server bermasalah.');
    } finally {
      setLoading(false);
    }
  };

  const openReconcileModal = (id: string) => {
    setReconcileTxId(id);
    setConfirmReconcileOpen(true);
  };

  const handleConfirmReconcile = async () => {
    if (!reconcileTxId) return;

    setActionLoading(true);
    try {
      await api.manualReconcile(reconcileTxId);
      await loadTransactions();
      if (selectedTx?.id === reconcileTxId) {
        setSelectedTx((prev) => (prev ? { ...prev, status: 'PAID' } : prev));
      }
      setConfirmReconcileOpen(false);
      toast.gold('Status Diperbarui: LUNAS 🌟', `Transaksi #${selectedTx?.order_id || reconcileTxId} berhasil diverifikasi & webhook sukses dikirim.`);
    } catch (err: any) {
      toast.error('Gagal Rekonsiliasi', err.message || 'Gagal menandai sebagai lunas.');
    } finally {
      setActionLoading(false);
    }
  };

  const copyText = (text: string, id: string, label = 'Teks') => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.gold('Berhasil Disalin ✨', `${label} telah disalin ke clipboard.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredTxs = transactions.filter((tx) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      tx.order_id?.toLowerCase().includes(q) ||
      tx.app_name?.toLowerCase().includes(q) ||
      tx.customer_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
            Transactions
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Daftar lengkap riwayat pembayaran dan rekonsiliasi manual.
          </p>
        </div>

        <button
          onClick={() => loadTransactions(true)}
          className="p-2 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl text-zinc-600 transition shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        
        {/* Status Filter Tabs */}
        <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-semibold w-full sm:w-auto overflow-x-auto">
          {[
            { label: 'Semua', value: '' },
            { label: 'Pending', value: 'PENDING' },
            { label: 'Success', value: 'PAID' },
            { label: 'Expired', value: 'EXPIRED' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                statusFilter === tab.value
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-stone-200'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari order ID atau customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 transition"
          />
        </div>

      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50/80 text-zinc-500 font-semibold border-b border-stone-100">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Client App</th>
                <th className="py-3 px-4">Base Amount</th>
                <th className="py-3 px-4">Kode Unik</th>
                <th className="py-3 px-4">Total Tagihan</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Dibuat</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-zinc-700">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-400">
                    Tidak ada transaksi ditemukan.
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-stone-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                      {tx.order_id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-zinc-800">
                      {tx.app_name || 'App'}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600">
                      {formatIDR(tx.amount)}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {tx.unique_code > 0 ? (
                        <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200/60">
                          +{tx.unique_code}
                        </span>
                      ) : (
                        <span className="text-zinc-300">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-black text-zinc-900">
                      {formatIDR(tx.total_amount || tx.amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-stone-100 text-zinc-700 px-2 py-0.5 rounded-md font-medium">
                        {tx.channel === 'QRIS' ? 'QRIS' : 'Transfer'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {tx.status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" />
                          Success
                        </span>
                      ) : tx.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending
                        </span>
                      ) : (
                        <span className="bg-zinc-100 text-zinc-500 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                          {tx.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">
                      {formatDate(tx.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-zinc-600 transition"
                          title="Detail Transaksi"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={`/pay/${tx.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition"
                          title="Buka Checkout Page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL & MANUAL RECONCILE MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-amber-200 shadow-gold-lg space-y-4">
            
            <div className="flex justify-between items-start border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">Detail Transaksi #{selectedTx.order_id}</h3>
                <p className="text-xs text-zinc-400">{selectedTx.app_name} • ID: {selectedTx.id}</p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Nominal Asli</span>
                <span className="font-medium text-zinc-800">{formatIDR(selectedTx.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Kode Unik 3-Digit</span>
                <span className="font-bold text-amber-800">+{selectedTx.unique_code}</span>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-2 text-sm">
                <span className="font-bold text-zinc-800">Total Tagihan</span>
                <span className="font-black text-amber-900">{formatIDR(selectedTx.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Status Pembayaran</span>
                <span className="font-bold">{selectedTx.status}</span>
              </div>
            </div>

            {/* Checkout Link Copy */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-500 block mb-1">Public Checkout URL</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/pay/${selectedTx.id}`}
                  className="flex-1 px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl font-mono text-zinc-600"
                />
                <button
                  onClick={() => copyText(`${window.location.origin}/pay/${selectedTx.id}`, 'modal-link')}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-1 border border-amber-200"
                >
                  {copiedId === 'modal-link' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Salin</span>
                </button>
              </div>
            </div>

            {/* Metadata / PMB Information */}
            {selectedTx.metadata && Object.keys(selectedTx.metadata).length > 0 && (
              <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-1.5">
                <span className="text-[11px] font-bold text-amber-900 block">Informasi Tambahan (PMB / Siswa):</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {Object.entries(selectedTx.metadata).map(([key, val]) => (
                    <div key={key} className="bg-white/80 px-2.5 py-1.5 rounded-lg border border-amber-100">
                      <span className="text-zinc-400 capitalize block text-[10px]">{key.replace(/_/g, ' ')}</span>
                      <span className="font-semibold text-zinc-800">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes if any */}
            {selectedTx.notes && (
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <span className="text-zinc-400 block text-[10px]">Catatan:</span>
                <span className="text-zinc-700">{selectedTx.notes}</span>
              </div>
            )}

            {/* Resend Webhook for PAID Transaction */}
            {selectedTx.status === 'PAID' && (
              <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Status: LUNAS (PAID)</span>
                  </div>
                  <button
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        const res = await api.resendWebhook(selectedTx.id);
                        if (res.is_success) {
                          toast.gold('Webhook Berhasil Dikirim! 🚀', `Server klien merespons HTTP ${res.response_status}.`);
                        } else {
                          toast.error('Webhook Gagal', `Server klien mengembalikan status ${res.response_status || 'Error'}.`);
                        }
                      } catch (e: any) {
                        toast.error('Gagal Mengirim Webhook', e.message || 'Koneksi gagal.');
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                    <span>{actionLoading ? 'Mengirim...' : 'Kirim Ulang Webhook'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Kirim ulang notifikasi <code className="text-emerald-700 font-mono">payment.success</code> jika server PMB sempat down saat pembayaran terjadi.
                </p>
              </div>
            )}

            {/* Fallback Manual Mark As Paid Action */}
            {selectedTx.status !== 'PAID' && (
              <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span>Manual Mark As Paid</span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Gunakan ini jika pembeli transfer secara manual namun nominalnya keliru dan sistem belum mencocokkannya otomatis.
                </p>
                <button
                  onClick={() => openReconcileModal(selectedTx.id)}
                  disabled={actionLoading}
                  className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold shadow-2xs transition"
                >
                  {actionLoading ? 'Memproses...' : 'Tandai LUNAS & Kirim Webhook'}
                </button>
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-zinc-700 rounded-xl text-xs font-semibold transition"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRM MANUAL RECONCILE MODAL */}
      <ConfirmModal
        isOpen={confirmReconcileOpen}
        onClose={() => setConfirmReconcileOpen(false)}
        onConfirm={handleConfirmReconcile}
        title="Tandai Transaksi Sebagai LUNAS?"
        description="Transaksi akan diubah statusnya menjadi PAID, kode unik akan dilepaskan, dan webhook pembayaran sukses akan otomatis dikirim ke server aplikasi klien."
        confirmText="Ya, Tandai LUNAS & Kirim Webhook"
        cancelText="Batal"
        type="gold"
        loading={actionLoading}
      />

    </div>
  );
}
