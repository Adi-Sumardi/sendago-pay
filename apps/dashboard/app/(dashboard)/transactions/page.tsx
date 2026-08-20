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
  Layers,
  Sparkles,
  X,
} from 'lucide-react';
import { api, PaymentDetails, AppProfile } from '@/lib/api';
import { formatIDR, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export default function TransactionsPage() {
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<PaymentDetails[]>([]);
  const [apps, setApps] = useState<AppProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTx, setSelectedTx] = useState<PaymentDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmReconcileOpen, setConfirmReconcileOpen] = useState(false);
  const [reconcileTxId, setReconcileTxId] = useState<string | null>(null);

  useEffect(() => {
    // Load list of registered apps for filter dropdown
    api.getApps()
      .then((data) => setApps(Array.isArray(data) ? data : []))
      .catch(() => setApps([]));
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [statusFilter, selectedAppId]);

  const loadTransactions = async (isManual = false) => {
    setLoading(true);
    try {
      const data = await api.getTransactions(statusFilter, selectedAppId);
      setTransactions(Array.isArray(data) ? data : []);
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
    if (selectedAppId && tx.app_id !== selectedAppId) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      tx.order_id?.toLowerCase().includes(q) ||
      tx.app_name?.toLowerCase().includes(q) ||
      tx.customer_name?.toLowerCase().includes(q) ||
      tx.customer_email?.toLowerCase().includes(q)
    );
  });

  const resetFilters = () => {
    setStatusFilter('');
    setSelectedAppId('');
    setSearchQuery('');
  };

  const isFiltered = statusFilter !== '' || selectedAppId !== '' || searchQuery !== '';

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Transactions</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-zinc-600 border border-stone-200">
              {filteredTxs.length} Total
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Daftar lengkap riwayat pembayaran dan rekonsiliasi manual lintas seluruh aplikasi Anda.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-zinc-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
          <button
            onClick={() => loadTransactions(true)}
            className="p-2 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl text-zinc-600 transition shadow-2xs"
            title="Refresh data transaksi"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* FILTERS & SEARCH TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          
          {/* Status Filter Tabs */}
          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-semibold overflow-x-auto">
            {[
              { label: 'Semua Status', value: '' },
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

          {/* App / Integration Dropdown Filter */}
          <div className="relative min-w-[220px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              aria-label="Filter berdasarkan aplikasi"
              className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl font-medium border transition cursor-pointer appearance-none ${
                selectedAppId
                  ? 'bg-emerald-50/50 border-emerald-300 text-emerald-950 font-bold'
                  : 'bg-stone-50 hover:bg-stone-100/80 border-stone-200 text-zinc-700'
              } focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400`}
            >
              <option value="">🏢 Semua Aplikasi / Integrasi</option>
              {apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-zinc-400">
              <Filter className="w-3 h-3" />
            </div>
          </div>

        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari order ID, customer, aplikasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50/80 text-zinc-500 font-semibold border-b border-stone-100">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Aplikasi Klien</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Base Amount</th>
                <th className="py-3 px-4">Kode Unik</th>
                <th className="py-3 px-4">Total Tagihan</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-zinc-700">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center mx-auto text-zinc-400">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-zinc-700 text-sm">Tidak ada transaksi ditemukan</p>
                      <p className="text-xs text-zinc-400">
                        {isFiltered
                          ? 'Coba ubah atau reset filter pencarian dan aplikasi untuk melihat transaksi lain.'
                          : 'Belum ada data transaksi yang tercatat di database.'}
                      </p>
                      {isFiltered && (
                        <button
                          onClick={resetFilters}
                          className="mt-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 transition"
                        >
                          Reset Semua Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-stone-50/60 transition">
                    
                    {/* Order ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                      {tx.order_id}
                    </td>

                    {/* Client App Badge */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/80 text-emerald-900 border border-emerald-200/80 text-[11px] font-bold">
                        <Layers className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate max-w-[140px]">{tx.app_name || 'Aplikasi SendaGo'}</span>
                      </span>
                    </td>

                    {/* Customer Name */}
                    <td className="py-3.5 px-4 font-medium text-zinc-800">
                      <div>
                        <p className="font-bold text-zinc-900">{tx.customer_name || 'Pelanggan'}</p>
                        {tx.customer_email && (
                          <p className="text-[10px] text-zinc-400 truncate max-w-[130px]">{tx.customer_email}</p>
                        )}
                      </div>
                    </td>

                    {/* Base Amount */}
                    <td className="py-3.5 px-4 text-zinc-600 font-medium">
                      {formatIDR(tx.amount)}
                    </td>

                    {/* Unique Code */}
                    <td className="py-3.5 px-4 font-mono">
                      {tx.unique_code > 0 ? (
                        <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200/60">
                          +{tx.unique_code}
                        </span>
                      ) : (
                        <span className="text-zinc-300">-</span>
                      )}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-4 font-black text-zinc-900">
                      {formatIDR(tx.total_amount || tx.amount)}
                    </td>

                    {/* Channel */}
                    <td className="py-3.5 px-4">
                      <span className="bg-stone-100 text-zinc-700 px-2 py-0.5 rounded-md font-medium">
                        {tx.channel === 'QRIS' ? 'QRIS Dinamis' : 'Transfer Bank'}
                      </span>
                    </td>

                    {/* Status */}
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

                    {/* Date */}
                    <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                      {formatDate(tx.created_at)}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-zinc-600 transition"
                          title="Lihat Detail Transaksi"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={`/pay/${tx.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition"
                          title="Buka Public Checkout Page"
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
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-amber-200 shadow-gold-lg space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">Detail Transaksi #{selectedTx.order_id}</h3>
                <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                  <Layers className="w-3 h-3 text-emerald-600" />
                  <span className="font-semibold text-emerald-800">{selectedTx.app_name || 'Aplikasi SendaGo'}</span>
                  <span>•</span>
                  <span>ID: {selectedTx.id}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold p-1 rounded-lg hover:bg-stone-100"
              >
                ✕
              </button>
            </div>

            {/* Financial Details */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Nominal Tagihan Asli</span>
                <span className="font-medium text-zinc-800">{formatIDR(selectedTx.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Kode Unik 3-Digit</span>
                <span className="font-bold text-amber-800">+{selectedTx.unique_code}</span>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-2 text-sm">
                <span className="font-bold text-zinc-800">Total Nominal Transfer</span>
                <span className="font-black text-emerald-800">{formatIDR(selectedTx.total_amount || selectedTx.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Status Pembayaran</span>
                <span className="font-bold">{selectedTx.status}</span>
              </div>
            </div>

            {/* Public Checkout Link */}
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
                  onClick={() => copyText(`${window.location.origin}/pay/${selectedTx.id}`, 'modal-link', 'Checkout Link')}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-1 border border-amber-200"
                >
                  {copiedId === 'modal-link' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Salin</span>
                </button>
              </div>
            </div>

            {/* Metadata (SIAKAD / PMB / Siswa Information) */}
            {selectedTx.metadata && Object.keys(selectedTx.metadata).length > 0 && (
              <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-1.5">
                <span className="text-[11px] font-bold text-amber-900 block flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Metadata Integrasi (Siswa / Tagihan):</span>
                </span>
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

            {/* Manual Reconcile Button (If Pending) */}
            {selectedTx.status === 'PENDING' && (
              <div className="border-t border-stone-100 pt-3">
                <button
                  onClick={() => openReconcileModal(selectedTx.id)}
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tandai Lunas Secara Manual (Force Paid & Dispatch Webhook)</span>
                </button>
                <p className="text-[10px] text-zinc-400 text-center mt-1">
                  Gunakan ini jika pelanggan telah mentransfer secara manual namun mutasi belum otomatis terdeteksi.
                </p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* CONFIRM RECONCILE MODAL */}
      <ConfirmModal
        isOpen={confirmReconcileOpen}
        title="Konfirmasi Rekonsiliasi Manual"
        description="Apakah Anda yakin ingin mengubah status transaksi ini menjadi LUNAS (PAID) secara manual? Sistem akan otomatis mendispatch webhook notifikasi ke server aplikasi terkait."
        confirmText="Ya, Tandai Lunas"
        cancelText="Batal"
        type="gold"
        loading={actionLoading}
        onConfirm={handleConfirmReconcile}
        onClose={() => setConfirmReconcileOpen(false)}
      />

    </div>
  );
}
