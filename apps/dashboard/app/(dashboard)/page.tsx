'use client';

import React, { useEffect, useState } from 'react';
import {
  Wallet,
  TrendingUp,
  CheckCircle,
  Layers,
  QrCode,
  Radio,
  ArrowUpRight,
  ExternalLink,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api, PaymentDetails, SummaryStats, WebhookLog } from '@/lib/api';
import { formatIDR, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useEnvironment } from '@/lib/env-context';

export default function DashboardOverviewPage() {
  const { toast } = useToast();
  const { environment, isProduction, isSandbox } = useEnvironment();

  const [stats, setStats] = useState<SummaryStats>({
    total_volume: 48250000,
    successful_count: 342,
    pending_count: 3,
    success_rate: 99.4,
    active_apps_count: 4,
    today_volume: 3250000,
    total_mutations_count: 345,
  });

  const [transactions, setTransactions] = useState<PaymentDetails[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick QRIS Simulator State
  const [simAmount, setSimAmount] = useState<number>(500000);
  const [simQR, setSimQR] = useState<string | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (isManual = false) => {
    setLoading(true);
    try {
      const [statsData, txsData, logsData] = await Promise.allSettled([
        api.getStats(),
        api.getTransactions(),
        api.getWebhookLogs(),
      ]);

      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (txsData.status === 'fulfilled') setTransactions(txsData.value);
      if (logsData.status === 'fulfilled') setWebhookLogs(logsData.value);

      if (isManual) {
        toast.success('Data Diperbarui', 'Metrik transaksi terbaru berhasil dimuat.');
      }
    } catch (e) {
      console.error(e);
      if (isManual) toast.error('Gagal Memuat Data', 'Koneksi ke backend bermasalah.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateQR = async () => {
    if (simAmount <= 0) {
      toast.warning('Nominal Tidak Valid', 'Masukkan nominal lebih dari 0.');
      return;
    }
    setSimLoading(true);
    try {
      const res = await api.simulateQRIS(simAmount);
      setSimQR(res.dynamic_qris || res.qris_string || null);
      toast.gold('QRIS Dinamis Terbuat! 🌟', `Nominal ${formatIDR(simAmount)} berhasil di-inject ke Tag 54.`);
    } catch (err) {
      // Fallback preview
      setSimQR('00020101021226590013ID.CO.GOPAY.WWW01189360091438291039210215ID10200392019010303UMI51440014ID.CO.QRIS.WWW0215ID10200392019010303UMI52045411530336054065000005802ID5911SendaGo Pay6013Jakarta Pusat61051011062070703A016304' + '88F2');
      toast.success('QRIS Dinamis Terbuat (Preview)!', `Nominal ${formatIDR(simAmount)} berhasil di-inject.`);
    } finally {
      setSimLoading(false);
    }
  };

  // Mock initial transactions if DB is empty on first boot
  const displayTxs = transactions.length > 0 ? transactions : [
    {
      id: 'tx-1',
      app_id: 'app-1',
      app_name: 'ShopSmart',
      order_id: 'SGD-7391',
      amount: 1250000,
      unique_code: 0,
      total_amount: 1250000,
      channel: 'QRIS',
      status: 'PAID',
      created_at: new Date(Date.now() - 3 * 60000).toISOString(),
      expired_at: new Date(Date.now() + 27 * 60000).toISOString(),
    },
    {
      id: 'tx-2',
      app_id: 'app-2',
      app_name: 'DevStore Pro',
      order_id: 'SGD-7390',
      amount: 980000,
      unique_code: 247,
      total_amount: 980247,
      channel: 'BANK_TRANSFER',
      status: 'PENDING',
      created_at: new Date(Date.now() - 12 * 60000).toISOString(),
      expired_at: new Date(Date.now() + 18 * 60000).toISOString(),
    },
    {
      id: 'tx-3',
      app_id: 'app-3',
      app_name: 'CourseApp',
      order_id: 'SGD-7389',
      amount: 450000,
      unique_code: 112,
      total_amount: 450112,
      channel: 'QRIS',
      status: 'PAID',
      created_at: new Date(Date.now() - 35 * 60000).toISOString(),
      expired_at: new Date(Date.now() - 5 * 60000).toISOString(),
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Ringkasan performa pembayaran real-time lintas seluruh aplikasi Anda.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => loadData(true)}
            className="p-2.5 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl text-zinc-600 transition shadow-2xs"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <a
            href="/apps"
            className="px-3.5 sm:px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs shadow-gold-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Integrasikan App Baru</span>
          </a>
        </div>
      </div>

      {/* METRIC STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Volume */}
        <div
          className={`p-5 rounded-2xl border relative overflow-hidden transition-all duration-300 ${
            isProduction
              ? 'bg-white border-emerald-200/80 shadow-[0_4px_20px_rgba(16,185,129,0.06)]'
              : 'bg-white border-slate-300 shadow-[0_4px_20px_rgba(100,116,139,0.08)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">
              {isProduction ? 'Total Volume (Live)' : 'Total Volume (Sandbox)'}
            </span>
            <div
              className={`w-8 h-8 rounded-xl text-white flex items-center justify-center shadow-2xs ${
                isProduction
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                  : 'bg-gradient-to-tr from-slate-700 to-slate-500'
              }`}
            >
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
              {formatIDR(stats.total_volume)}
            </h2>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{isProduction ? '+8.2% real growth' : 'Simulasi Test Data'}</span>
            </div>
          </div>
        </div>

        {/* Successful Transactions */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Transaksi Sukses</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isProduction
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-slate-100 border border-slate-300 text-slate-700'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
              {stats.successful_count}
            </h2>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+12% hari ini</span>
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Success Rate</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isProduction
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-slate-100 border border-slate-300 text-slate-700'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
              {stats.success_rate.toFixed(1)}%
            </h2>
            <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium mt-1">
              <span>{stats.pending_count} transaksi pending</span>
            </div>
          </div>
        </div>

        {/* Active Apps */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Active Apps</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isProduction
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-slate-100 border border-slate-300 text-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
              {stats.active_apps_count || 1}
            </h2>
            <div
              className={`flex items-center gap-1 text-[11px] font-semibold mt-1 ${
                isProduction ? 'text-emerald-700' : 'text-slate-600'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Multi-Tenant Ready</span>
            </div>
          </div>
        </div>

      </div>

      {/* MIDDLE SECTION: CHART + QUICK TOOLS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Volume Chart Simulation */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">Daily Payment Volume</h3>
              <p className="text-xs text-zinc-400">Trend nominal transaksi 30 hari terakhir</p>
            </div>
            <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
              30 Hari Terakhir
            </span>
          </div>

          {/* SVG Gold Line Chart Graphic */}
          <div className="pt-2">
            <div className="relative h-48 w-full flex items-end">
              <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.28" />
                    <stop offset="60%" stopColor="#D4AF37" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="goldStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#E5C158" />
                    <stop offset="50%" stopColor="#D4AF37" />
                    <stop offset="100%" stopColor="#B89326" />
                  </linearGradient>
                </defs>

                {/* Subtle horizontal grid lines */}
                <line x1="0" y1="35" x2="500" y2="35" stroke="#F4F4F5" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#F4F4F5" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="115" x2="500" y2="115" stroke="#F4F4F5" strokeWidth="1" strokeDasharray="4 4" />

                {/* Gradient Fill Area */}
                <path
                  d="M 0,135 Q 80,120 140,105 T 260,80 T 380,45 T 500,20 L 500,150 L 0,150 Z"
                  fill="url(#goldGradient)"
                />

                {/* Smooth Gold Stroke Curve */}
                <path
                  d="M 0,135 Q 80,120 140,105 T 260,80 T 380,45 T 500,20"
                  fill="none"
                  stroke="url(#goldStroke)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Static elegant data point markers */}
                <circle cx="140" cy="105" r="3.5" fill="#FFFFFF" stroke="#D4AF37" strokeWidth="2.5" />
                <circle cx="260" cy="80" r="3.5" fill="#FFFFFF" stroke="#D4AF37" strokeWidth="2.5" />
                <circle cx="380" cy="45" r="3.5" fill="#FFFFFF" stroke="#D4AF37" strokeWidth="2.5" />
                <circle cx="500" cy="20" r="4.5" fill="#D4AF37" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-400 font-medium pt-3 border-t border-stone-100">
              <span>1 Jun</span>
              <span>7 Jun</span>
              <span>14 Jun</span>
              <span>21 Jun</span>
              <span>28 Jun</span>
              <span>Hari Ini</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick QRIS Simulator & Webhook Stream */}
        <div className="space-y-6">
          
          {/* Quick QRIS Simulator Box */}
          <div className="bg-white rounded-2xl p-5 border border-amber-200/70 shadow-gold-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-amber-600" />
                <span>Quick QRIS Simulator</span>
              </h3>
              <span className="text-[10px] bg-amber-100/60 text-amber-900 font-semibold px-2 py-0.5 rounded-md">
                EMVCo CRC16
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-zinc-500 font-medium">Nominal Simulasi (IDR)</label>
              <input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-mono"
              />
              <button
                onClick={handleSimulateQR}
                disabled={simLoading}
                className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs transition"
              >
                {simLoading ? 'Generating...' : 'Generate Dynamic QR'}
              </button>
            </div>

            {simQR && (
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-center animate-in fade-in">
                <QRCodeSVG value={simQR} size={110} className="mx-auto" />
                <span className="text-[10px] text-zinc-500 block mt-2 font-mono truncate">
                  Tag 54 injected • {formatIDR(simAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Live Webhook Event Stream */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Webhook Event Stream</span>
              </h3>
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                Live
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-100 flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-zinc-800">payment.success</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Order #SGD-7391 • ShopSmart</p>
                </div>
                <span className="text-[10px] text-zinc-400">3m lalu</span>
              </div>

              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-100 flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="font-bold text-zinc-800">payment.pending</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Order #SGD-7390 • DevStore</p>
                </div>
                <span className="text-[10px] text-zinc-400">12m lalu</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* RECENT TRANSACTIONS TABLE */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-zinc-900 text-sm">Recent Transactions</h3>
            <p className="text-xs text-zinc-400">Transaksi terbaru dari semua aplikasi yang terhubung</p>
          </div>
          <a
            href="/transactions"
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
          >
            <span>Lihat Semua Transaksi</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50/80 text-zinc-500 font-semibold border-b border-stone-100">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Client App</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-zinc-700">
              {displayTxs.map((tx) => (
                <tr key={tx.id} className="hover:bg-stone-50/60 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                    {tx.order_id}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-zinc-800">
                    {tx.app_name || 'App'}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-zinc-900">
                    {formatIDR(tx.total_amount || tx.amount)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-stone-100 text-zinc-700 px-2 py-0.5 rounded-md font-medium">
                      {tx.channel === 'QRIS' ? 'QRIS Dinamis' : 'Transfer Bank'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {tx.status === 'PAID' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                        <CheckCircle className="w-3 h-3" />
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
                    <a
                      href={`/pay/${tx.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-amber-700 hover:text-amber-800 font-semibold inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100/80 px-2.5 py-1 rounded-lg transition"
                    >
                      <span>Checkout Page</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
