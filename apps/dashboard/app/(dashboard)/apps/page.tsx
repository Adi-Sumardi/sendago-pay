'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Key,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Radio,
  ExternalLink,
  ShieldCheck,
  FlaskConical,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Code2,
  Trash2,
  Ban,
  PowerOff,
  CheckCircle2,
  Lock,
  Mail,
  Send,
  Clock,
  XCircle,
  FileText,
  AlertTriangle,
  UserCheck,
  Inbox,
  ShieldAlert,
} from 'lucide-react';
import { api, AppProfile, KeyRegenRequest, EmailNotificationPreview } from '@/lib/api';
import { auth, AuthUser } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useEnvironment } from '@/lib/env-context';

export default function ConnectedAppsPage() {
  const { toast } = useToast();
  const { environment, isProduction, isSandbox } = useEnvironment();

  const [activeTab, setActiveTab] = useState<'apps' | 'requests'>('apps');
  const [apps, setApps] = useState<AppProfile[]>([]);
  const [keyRequests, setKeyRequests] = useState<KeyRegenRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Create App Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [newAppWebhook, setNewAppWebhook] = useState('');
  const [creating, setCreating] = useState(false);

  const [visibleSecrets, setVisibleSecrets] = useState<{ [key: string]: boolean }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // 1. Instant Sandbox Regenerate Modal
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);
  const [selectedAppForRegen, setSelectedAppForRegen] = useState<{ id: string; name: string } | null>(null);

  // 2. Live Key Request Form Modal
  const [showLiveRequestModal, setShowLiveRequestModal] = useState(false);
  const [selectedAppForLiveRequest, setSelectedAppForLiveRequest] = useState<AppProfile | null>(null);
  const [requestReason, setRequestReason] = useState('Rotasi Berkala Rutin Kebijakan Keamanan (Security Compliance)');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // 3. Admin Approve / Reject Modals
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [selectedRequestForApprove, setSelectedRequestForApprove] = useState<KeyRegenRequest | null>(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] = useState<KeyRegenRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Permintaan tidak memenuhi syarat keamanan.');

  // 4. Email Notification Preview Modal
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState<EmailNotificationPreview | null>(null);

  // 5. Revoke & Delete Modals
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);
  const [selectedAppForRevoke, setSelectedAppForRevoke] = useState<{ id: string; name: string; isActive: boolean } | null>(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedAppForDelete, setSelectedAppForDelete] = useState<{ id: string; name: string } | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const user = auth.getUser();
    setCurrentUser(user);
    if (user?.email) {
      setRequestEmail(user.email);
    } else {
      setRequestEmail('admin@sendago.pay');
    }
    loadData();
  }, [environment]);

  const loadData = async (isManual = false) => {
    setLoading(true);
    try {
      const [appsData, requestsData] = await Promise.all([
        api.getApps(),
        api.getKeyRegenRequests(),
      ]);

      if (appsData && appsData.length > 0) {
        setApps(appsData);
      } else {
        setApps([
          {
            id: 'app-default-1',
            name: 'SendaGo SaaS Platform',
            description: 'Aplikasi utama checkout course dan SaaS internal',
            public_key: isProduction ? 'sg_live_pk_88a91b2c4d5e6f7a' : 'sg_test_pk_11a22b33c44d55e6',
            secret_key: isProduction ? 'sg_live_sk_99b82c3d4e5f6a7b8c9d0e1f' : 'sg_test_sk_77b66c55d44e33f21a0b',
            webhook_url: 'https://api.sendago.com/webhooks/payment',
            webhook_secret: isProduction ? 'whsec_live_9928192831' : 'whsec_test_0019283741',
            is_active: true,
            created_at: new Date().toISOString(),
          },
          {
            id: 'app-default-2',
            name: 'SendaGo Mobile App',
            description: 'Aplikasi Flutter Android/iOS Checkout',
            public_key: isProduction ? 'sg_live_pk_44e55f66a77b88c9' : 'sg_test_pk_99x88y77z66a55b4',
            secret_key: isProduction ? 'sg_live_sk_11a22b33c44d55e6f7a8b9c0' : 'sg_test_sk_44c55d66e77f88a99b',
            webhook_url: 'https://store.sendago.com/api/payment-callback',
            webhook_secret: isProduction ? 'whsec_live_7728192842' : 'whsec_test_5544332211',
            is_active: true,
            created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          },
        ]);
      }

      setKeyRequests(requestsData || []);

      if (isManual) toast.gold('Data Diperbarui', 'Daftar aplikasi dan permohonan API Keys telah dimuat ulang.');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const pendingRequestsCount = (keyRequests || []).filter((r) => r.status === 'PENDING').length;

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName) return;

    setCreating(true);
    try {
      const created = await api.createApp({
        name: newAppName,
        description: newAppDesc,
        webhook_url: newAppWebhook,
        environment: environment,
      });

      setNewAppName('');
      setNewAppDesc('');
      setNewAppWebhook('');
      setShowCreateModal(false);
      await loadData();

      const keyType = isProduction ? 'Live Production (sg_live_*)' : 'Sandbox Test (sg_test_*)';
      toast.gold(
        `Aplikasi Berhasil Dibuat! 🌟`,
        `Kunci API ${keyType} untuk ${created.name || newAppName} telah siap digunakan.`
      );
    } catch (err: any) {
      toast.error('Gagal Membuat Aplikasi', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setCreating(false);
    }
  };

  // 1. REGENERATE TRIGGER
  const handleRegenerateClick = (app: AppProfile) => {
    if (isProduction) {
      // In Live Production mode: Must submit request form first
      setSelectedAppForLiveRequest(app);
      setShowLiveRequestModal(true);
    } else {
      // In Sandbox mode: Instant rotate
      setSelectedAppForRegen({ id: app.id, name: app.name });
      setConfirmRegenerateOpen(true);
    }
  };

  // Sandbox instant regenerate confirm
  const handleConfirmSandboxRegenerate = async () => {
    if (!selectedAppForRegen) return;
    setActionLoading(true);
    try {
      await api.regenerateKeys(selectedAppForRegen.id, 'sandbox');
      await loadData();
      setConfirmRegenerateOpen(false);
      toast.gold(
        'Sandbox Keys Direset! ✨',
        `Kunci tes baru (sg_test_*) untuk ${selectedAppForRegen.name} telah aktif.`
      );
    } catch (err: any) {
      toast.error('Gagal Regenerate Keys', err.message || 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  // Live request submission
  const handleSubmitLiveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForLiveRequest || !requestReason || !requestEmail) return;

    setSubmittingRequest(true);
    try {
      await api.submitKeyRegenRequest(selectedAppForLiveRequest.id, {
        reason: requestReason,
        requested_by: requestEmail,
        notes: requestNotes,
        environment: 'production',
      });

      setShowLiveRequestModal(false);
      setRequestNotes('');
      await loadData();
      setActiveTab('requests'); // Switch to requests tab to view status

      toast.gold(
        'Permintaan Berhasil Dikirim! 📋',
        `Permintaan regenerasi Live API Key untuk ${selectedAppForLiveRequest.name} telah diajukan dan menunggu persetujuan Administrator.`
      );
    } catch (err: any) {
      toast.error('Gagal Mengajukan Permintaan', err.message || 'Terjadi kesalahan.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // 2. ADMIN APPROVE LIVE REQUEST
  const openApproveModal = (req: KeyRegenRequest) => {
    setSelectedRequestForApprove(req);
    setConfirmApproveOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedRequestForApprove) return;
    setActionLoading(true);
    try {
      const result = await api.approveKeyRegenRequest(selectedRequestForApprove.id);
      await loadData();
      setConfirmApproveOpen(false);

      if (result.email_notification) {
        setEmailPreviewData(result.email_notification);
        setShowEmailPreviewModal(true);
      }

      toast.gold(
        'Permintaan Disetujui & Email Terkirim! 🚀',
        `Kunci API Live baru untuk ${selectedRequestForApprove.app_name} telah aktif dan email notifikasi telah dikirim ke ${selectedRequestForApprove.requested_by}.`
      );
    } catch (err: any) {
      toast.error('Gagal Menyetujui Permintaan', err.message || 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. ADMIN REJECT LIVE REQUEST
  const openRejectModal = (req: KeyRegenRequest) => {
    setSelectedRequestForReject(req);
    setShowRejectModal(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequestForReject) return;
    setActionLoading(true);
    try {
      await api.rejectKeyRegenRequest(selectedRequestForReject.id, rejectionReason);
      await loadData();
      setShowRejectModal(false);
      toast.warning(
        'Permintaan Ditolak 🚫',
        `Permintaan regenerasi untuk ${selectedRequestForReject.app_name} telah ditolak.`
      );
    } catch (err: any) {
      toast.error('Gagal Menolak Permintaan', err.message || 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. REVOKE / TOGGLE KEY STATUS
  const openRevokeModal = (appId: string, appName: string, currentActive: boolean) => {
    setSelectedAppForRevoke({ id: appId, name: appName, isActive: currentActive });
    setConfirmRevokeOpen(true);
  };

  const handleConfirmRevoke = async () => {
    if (!selectedAppForRevoke) return;
    setActionLoading(true);
    const newStatus = !selectedAppForRevoke.isActive;
    try {
      await api.revokeApp(selectedAppForRevoke.id, newStatus);
      await loadData();
      setConfirmRevokeOpen(false);

      if (newStatus) {
        toast.gold('API Key Diaktifkan Kembali! 🟢', `Aplikasi ${selectedAppForRevoke.name} dapat memproses checkout kembali.`);
      } else {
        toast.warning('API Key Telah Di-Revoke! 🚫', `Semua request transaksi yang menggunakan key ${selectedAppForRevoke.name} akan ditolak.`);
      }
    } catch (err: any) {
      toast.error('Gagal Mengubah Status Key', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. DELETE APP PERMANENTLY
  const openDeleteModal = (appId: string, appName: string) => {
    setSelectedAppForDelete({ id: appId, name: appName });
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAppForDelete) return;
    setActionLoading(true);
    try {
      await api.deleteApp(selectedAppForDelete.id);
      await loadData();
      setConfirmDeleteOpen(false);
      toast.gold('Aplikasi & Key Dihapus! 🗑️', `Aplikasi ${selectedAppForDelete.name} beserta seluruh kredensial telah dihapus permanen.`);
    } catch (err: any) {
      toast.error('Gagal Menghapus Aplikasi', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string, label = 'Kredensial') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    toast.gold('Disalin ke Clipboard ✨', `${label} berhasil disalin.`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleSecretVisibility = (appId: string) => {
    setVisibleSecrets((prev) => ({ ...prev, [appId]: !prev[appId] }));
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              Connected Apps & API Keys
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isProduction
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-200 text-slate-800 border border-slate-300'
              }`}
            >
              {isProduction ? '🟢 Live Production Mode' : '🧪 Sandbox Test Mode'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-700" />
              <span>Admin Protected</span>
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Kelola aplikasi internal, alur permohonan persetujuan rotasi kunci Live, dan integrasi API SendaGo Pay.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            className="p-2.5 bg-stone-100 hover:bg-stone-200 text-zinc-600 rounded-xl transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className={`px-4 py-2.5 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto ${
              isProduction
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                : 'bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Aplikasi Baru</span>
          </button>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-1">
        <button
          onClick={() => setActiveTab('apps')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            activeTab === 'apps'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 hover:bg-stone-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Daftar Aplikasi ({apps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 relative ${
            activeTab === 'requests'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 hover:bg-stone-100'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Permintaan Rotasi Live Key</span>
          {pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-black bg-amber-500 text-white rounded-full">
              {pendingRequestsCount} PENDING
            </span>
          )}
        </button>
      </div>

      {/* TAB CONTENT: APPS LIST */}
      {activeTab === 'apps' && (
        <div className="grid grid-cols-1 gap-5">
          {apps.map((app) => {
            const isAppActive = app.is_active !== false;

            const displayPublicKey = isSandbox
              ? app.public_key.replace('sg_live_pk_', 'sg_test_pk_')
              : app.public_key.replace('sg_test_pk_', 'sg_live_pk_');

            const displaySecretKey = isSandbox
              ? app.secret_key.replace('sg_live_sk_', 'sg_test_sk_')
              : app.secret_key.replace('sg_test_sk_', 'sg_live_sk_');

            const displayWebhookSec = isSandbox
              ? app.webhook_secret.replace('whsec_live_', 'whsec_test_')
              : app.webhook_secret.replace('whsec_test_', 'whsec_live_');

            return (
              <div
                key={app.id}
                className={`bg-white rounded-3xl p-6 border shadow-xs space-y-5 transition-all duration-300 ${
                  !isAppActive
                    ? 'border-red-200/90 bg-red-50/10'
                    : isProduction
                    ? 'border-emerald-100 hover:border-emerald-300 shadow-[0_4px_24px_rgba(16,185,129,0.04)]'
                    : 'border-slate-200 hover:border-slate-400 shadow-[0_4px_24px_rgba(100,116,139,0.06)]'
                }`}
              >
                {/* App Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold ${
                        !isAppActive
                          ? 'bg-red-50 border border-red-200 text-red-700'
                          : isProduction
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                          : 'bg-slate-100 border border-slate-300 text-slate-800'
                      }`}
                    >
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-bold text-base ${!isAppActive ? 'text-zinc-500 line-through' : 'text-zinc-900'}`}>
                          {app.name}
                        </h3>
                        
                        {/* Active / Revoked Badge */}
                        {isAppActive ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>AKTIF</span>
                          </span>
                        ) : (
                          <span className="text-[10px] bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                            <Ban className="w-3 h-3" />
                            <span>KEY REVOKED / NONAKTIF</span>
                          </span>
                        )}

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            isProduction
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {isProduction ? '🟢 LIVE CREDENTIALS' : '🧪 SANDBOX TEST KEYS'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">{app.description || 'Tidak ada deskripsi'}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    
                    {/* Regenerate Keys Button: Live requires Approval Form, Sandbox is Instant */}
                    <button
                      onClick={() => handleRegenerateClick(app)}
                      disabled={!isAppActive}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                        isProduction
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-gold-sm'
                          : 'bg-stone-100 hover:bg-stone-200 text-zinc-700'
                      }`}
                      title={isProduction ? 'Ajukan Formulir Permintaan Regenerasi Live API Key' : 'Reset Sandbox Key Secara Instan'}
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{isProduction ? 'Ajukan Regenerate Key' : 'Regenerate Keys'}</span>
                    </button>

                    {/* Revoke / Aktifkan Button (Admin Only) */}
                    {isAppActive ? (
                      <button
                        onClick={() => openRevokeModal(app.id, app.name, true)}
                        className="px-3 py-1.5 text-xs font-bold text-amber-800 hover:text-red-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition flex items-center gap-1"
                        title="Cabut / Nonaktifkan akses API key ini"
                      >
                        <Ban className="w-3 h-3 text-amber-700" />
                        <span>Revoke Key</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => openRevokeModal(app.id, app.name, false)}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center gap-1"
                        title="Aktifkan kembali API key ini"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Aktifkan Kembali</span>
                      </button>
                    )}

                    {/* Delete App Button (Admin Only) */}
                    <button
                      onClick={() => openDeleteModal(app.id, app.name)}
                      className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 border border-stone-200 hover:border-red-200 rounded-xl transition"
                      title="Hapus aplikasi & key ini secara permanen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                  </div>
                </div>

                {/* Credentials Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Public Key */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1">
                      <Key className={`w-3 h-3 ${isProduction ? 'text-emerald-600' : 'text-slate-600'}`} />
                      <span>Public Key ({isProduction ? 'Live' : 'Sandbox'})</span>
                    </label>
                    <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
                      <span className="font-mono text-xs text-zinc-800 truncate flex-1 font-semibold">
                        {displayPublicKey}
                      </span>
                      <button
                        onClick={() => copyToClipboard(displayPublicKey, `${app.id}-pk`, 'Public Key')}
                        className="text-amber-700 hover:text-amber-800 pl-2"
                      >
                        {copiedKey === `${app.id}-pk` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Secret Key */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1">
                      <ShieldCheck className={`w-3 h-3 ${isProduction ? 'text-emerald-600' : 'text-slate-600'}`} />
                      <span>Secret Key (Backend Only)</span>
                    </label>
                    <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
                      <span className="font-mono text-xs text-zinc-800 truncate flex-1 font-semibold">
                        {visibleSecrets[app.id] ? displaySecretKey : '••••••••••••••••••••••••••••••••'}
                      </span>
                      <button
                        onClick={() => toggleSecretVisibility(app.id)}
                        className="text-zinc-400 hover:text-zinc-600 px-1.5"
                      >
                        {visibleSecrets[app.id] ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(displaySecretKey, `${app.id}-sk`, 'Secret Key')}
                        className="text-amber-700 hover:text-amber-800 pl-1"
                      >
                        {copiedKey === `${app.id}-sk` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Webhook Secret */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1">
                      <Radio className="w-3 h-3 text-emerald-600" />
                      <span>Webhook Signing Secret</span>
                    </label>
                    <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
                      <span className="font-mono text-xs text-zinc-800 truncate flex-1 font-semibold">
                        {visibleSecrets[app.id] ? displayWebhookSec : '••••••••••••••••••••••••'}
                      </span>
                      <button
                        onClick={() => copyToClipboard(displayWebhookSec, `${app.id}-whsec`, 'Webhook Secret')}
                        className="text-amber-700 hover:text-amber-800 pl-2"
                      >
                        {copiedKey === `${app.id}-whsec` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Webhook Endpoint Display */}
                <div
                  className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    isProduction
                      ? 'bg-emerald-50/40 border-emerald-100'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <span
                      className={`text-[11px] font-bold block ${
                        isProduction ? 'text-emerald-900' : 'text-slate-900'
                      }`}
                    >
                      Outbound Webhook URL ({isProduction ? 'Live' : 'Sandbox'})
                    </span>
                    <span className="font-mono text-xs text-zinc-600">
                      {app.webhook_url || 'Belum dikonfigurasi (Opsional)'}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400">Dibuat pada {formatDate(app.created_at)}</span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* TAB CONTENT: KEY REGENERATION REQUESTS APPROVAL QUEUE */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
            <div>
              <h2 className="font-bold text-zinc-900 text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <span>Persetujuan Regenerasi Kunci API Live Production</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Daftar permohonan rotasi kunci Live Production dari developer. Setiap persetujuan akan menerbitkan key baru dan mengirim email notifikasi ke pemohon.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl">
              {pendingRequestsCount} Permintaan Menunggu Persetujuan
            </span>
          </div>

          {keyRequests.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-400 space-y-2">
              <Inbox className="w-12 h-12 mx-auto text-zinc-300 stroke-[1.5]" />
              <p className="font-bold text-zinc-700 text-sm">Belum Ada Permintaan Rotasi Key</p>
              <p className="text-zinc-400 max-w-sm mx-auto">
                Ketika developer/user mengajukan regenerasi kunci Live, permohonan akan muncul di sini untuk ditinjau oleh Administrator.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-100 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    <th className="pb-3">Aplikasi</th>
                    <th className="pb-3">Pemohon</th>
                    <th className="pb-3">Alasan Permintaan</th>
                    <th className="pb-3">Diajukan Pada</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Aksi Administrator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100/80">
                  {keyRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-stone-50/60 transition">
                      
                      {/* App Name */}
                      <td className="py-4">
                        <div className="font-bold text-zinc-900">{req.app_name}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">ID: {req.app_id.substring(0, 8)}...</div>
                      </td>

                      {/* Requester */}
                      <td className="py-4">
                        <div className="flex items-center gap-1.5 font-medium text-zinc-800">
                          <Mail className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{req.requested_by}</span>
                        </div>
                      </td>

                      {/* Reason & Notes */}
                      <td className="py-4 max-w-xs">
                        <div className="font-semibold text-zinc-800 text-[11px] leading-tight">
                          {req.reason}
                        </div>
                        {req.notes && (
                          <div className="text-[10px] text-zinc-400 mt-1 italic line-clamp-1">
                            Catatan: &ldquo;{req.notes}&rdquo;
                          </div>
                        )}
                        {req.rejection_reason && (
                          <div className="text-[10px] text-red-600 mt-1 font-semibold">
                            Alasan Penolakan: {req.rejection_reason}
                          </div>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="py-4 text-zinc-500 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>{formatDate(req.created_at)}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 whitespace-nowrap">
                        {req.status === 'PENDING' && (
                          <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded-full flex items-center gap-1 w-max">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                            <span>PENDING APPROVAL</span>
                          </span>
                        )}
                        {req.status === 'APPROVED' && (
                          <div className="space-y-1">
                            <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>APPROVED</span>
                            </span>
                            {req.email_sent && (
                              <span className="text-[10px] text-emerald-700 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                <span>Email Terkirim</span>
                              </span>
                            )}
                          </div>
                        )}
                        {req.status === 'REJECTED' && (
                          <span className="px-2.5 py-1 text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 rounded-full flex items-center gap-1 w-max">
                            <XCircle className="w-3 h-3 text-red-600" />
                            <span>REJECTED</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 text-right whitespace-nowrap">
                        {req.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openApproveModal(req)}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs transition flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Setujui & Kirim Email</span>
                            </button>
                            <button
                              onClick={() => openRejectModal(req)}
                              className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Tolak</span>
                            </button>
                          </div>
                        ) : req.status === 'APPROVED' ? (
                          <button
                            onClick={() => {
                              setEmailPreviewData({
                                recipient: req.requested_by,
                                subject: `[SendaGo Pay] Permintaan Regenerate Live API Key untuk '${req.app_name}' Telah Disetujui`,
                                sender: 'security-alerts@sendago.pay (SendaGo Pay Notification)',
                                sent_at: req.approved_at || req.created_at,
                                app_name: req.app_name,
                                new_public_key: 'sg_live_pk_••••••••••••••••',
                                delivery_status: 'DELIVERED',
                                body_preview: `Permintaan Anda telah diverifikasi dan disetujui oleh Administrator (${req.approved_by || 'admin@sendago.pay'}). Kunci API Live baru telah diterbitkan.`,
                              });
                              setShowEmailPreviewModal(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition inline-flex items-center gap-1"
                          >
                            <Mail className="w-3 h-3 text-amber-600" />
                            <span>Lihat Log Email</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-zinc-400">Ditolak</span>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* MODAL 1: FORM PENGAJUAN REGENERASI LIVE KEY */}
      {showLiveRequestModal && selectedAppForLiveRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-amber-200 shadow-gold-lg space-y-4">
            
            <div className="flex justify-between items-start border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-base">
                    Permintaan Regenerasi Kunci API Live
                  </h3>
                  <p className="text-xs text-zinc-400">Aplikasi: {selectedAppForLiveRequest.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowLiveRequestModal(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Warning Alert */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Perhatian Keamanan Live Production:</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Rotasi kunci Live akan menonaktifkan Secret Key lama seketika. Formulir ini akan diteruskan ke Administrator untuk diverifikasi sebelum kunci baru diterbitkan.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitLiveRequest} className="space-y-3.5">
              
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Alasan Permintaan Rotasi Kunci <span className="text-red-500">*</span>
                </label>
                <select
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-medium"
                >
                  <option value="Kebocoran Kredensial / Dugaan Akses Tidak Sah (Security Incident)">
                    🚨 Kebocoran Kredensial / Dugaan Akses Tidak Sah (Security Incident)
                  </option>
                  <option value="Rotasi Berkala Rutin Kebijakan Keamanan (Security Compliance)">
                    🔄 Rotasi Berkala Rutin Kebijakan Keamanan (Security Compliance)
                  </option>
                  <option value="Pergantian Developer / Server Deployment Baru">
                    👥 Pergantian Developer / Server Deployment Baru
                  </option>
                  <option value="Kunci Tidak Sengaja Ter-commit ke Git Repository">
                    ⚠️ Kunci Tidak Sengaja Ter-commit ke Git Repository
                  </option>
                  <option value="Lainnya">
                    📝 Alasan Lainnya
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Email Pemohon (Penerima Notifikasi Kunci Baru) <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="developer@company.com"
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-mono"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  Email ini akan menerima surat notifikasi resmi saat permintaan telah disetujui oleh Administrator.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Rencana Migrasi & Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Rencana deploy jam 23:00 WIB, server backend sudah disiapkan untuk input secret key baru..."
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 text-zinc-800"
                />
              </div>

              <div className="pt-3 flex gap-2 justify-end border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowLiveRequestModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-zinc-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-gold-sm transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingRequest ? 'Mengirim...' : 'Kirim Permintaan ke Administrator'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM APPROVE LIVE KEY REQUEST (ADMIN ONLY) */}
      <ConfirmModal
        isOpen={confirmApproveOpen}
        onClose={() => setConfirmApproveOpen(false)}
        onConfirm={handleConfirmApprove}
        title={`Setujui Regenerasi Live Key "${selectedRequestForApprove?.app_name}"?`}
        description={`Sistem akan menerbitkan sepasang Live Public & Secret Key baru (sg_live_*), menggantikan key lama, dan secara otomatis mengirimkan email konfirmasi resmi ke "${selectedRequestForApprove?.requested_by}".`}
        confirmText="Ya, Setujui & Kirim Email"
        cancelText="Batal"
        type="warning"
        loading={actionLoading}
      />

      {/* MODAL 3: REJECT LIVE KEY REQUEST (ADMIN ONLY) */}
      {showRejectModal && selectedRequestForReject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-stone-200 shadow-xl space-y-4">
            
            <div className="flex justify-between items-start border-b border-stone-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-base">Tolak Permintaan Rotasi Key</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-zinc-400 hover:text-zinc-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-3.5">
              <p className="text-xs text-zinc-600">
                Anda akan menolak permintaan regenerasi kunci untuk <strong>{selectedRequestForReject.app_name}</strong> yang diajukan oleh <strong>{selectedRequestForReject.requested_by}</strong>.
              </p>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Alasan Penolakan</label>
                <textarea
                  rows={2}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-red-400 text-zinc-800"
                />
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-zinc-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  {actionLoading ? 'Menolak...' : 'Tolak Permintaan'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 4: EMAIL NOTIFICATION DISPATCH PREVIEW */}
      {showEmailPreviewModal && emailPreviewData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-amber-200 shadow-gold-lg space-y-4">
            
            <div className="flex justify-between items-start border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm">Notifikasi Email Resmi Terkirim</h3>
                  <p className="text-[10px] text-emerald-700 font-semibold">Status: DELIVERED TO RECIPIENT</p>
                </div>
              </div>
              <button onClick={() => setShowEmailPreviewModal(false)} className="text-zinc-400 hover:text-zinc-600 text-sm font-bold">✕</button>
            </div>

            {/* Email Client Layout Container */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs space-y-3 font-sans">
              
              <div className="space-y-1.5 border-b border-stone-200 pb-3 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Mail Gateway:</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {emailPreviewData.mail_server || 'sendagomail.adilabs.id'} (DKIM/SPF Verified)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Dari:</span>
                  <span className="font-semibold text-zinc-800">
                    {emailPreviewData.sender || 'no-reply@sendagomail.adilabs.id'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Kepada:</span>
                  <span className="font-bold text-amber-900">{emailPreviewData.recipient}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Subjek:</span>
                  <span className="font-bold text-zinc-900">{emailPreviewData.subject}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Waktu Kirim:</span>
                  <span className="text-zinc-500 font-mono text-[10px]">{formatDate(emailPreviewData.sent_at)}</span>
                </div>
              </div>

              {/* Email Content Box */}
              <div className="bg-white p-4 rounded-xl border border-stone-200/80 space-y-3 text-zinc-700 leading-relaxed text-xs">
                <div className="flex items-center gap-2 text-amber-800 font-black text-xs">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>SendaGo Pay Security & Engineering Team</span>
                </div>
                <p>Halo Pengguna SendaGo Pay,</p>
                <p>
                  Permintaan regenerasi <strong>Live Production API Key</strong> Anda untuk aplikasi <strong>&ldquo;{emailPreviewData.app_name}&rdquo;</strong> telah diverifikasi dan disetujui oleh Administrator.
                </p>
                
                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200 font-mono text-[10px] text-zinc-800 space-y-1">
                  <div>Aplikasi: <strong>{emailPreviewData.app_name}</strong></div>
                  <div>Environment: <strong className="text-emerald-700">LIVE PRODUCTION</strong></div>
                  <div>New Public Key: <strong>{emailPreviewData.new_public_key}</strong></div>
                  <div>New Secret Key: <strong>sg_live_sk_••••••••••••••••••••••••</strong> (Disembunyikan demi keamanan)</div>
                </div>

                <p className="text-[11px] text-zinc-500 italic">
                  * Kunci lama telah dinonaktifkan. Silakan buka Dashboard SendaGo Pay untuk menyalin Secret Key baru dan segera update backend server Anda.
                </p>
              </div>

            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowEmailPreviewModal(false)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition"
              >
                Tutup Preview
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 5: CONFIRM SANDBOX INSTANT REGENERATE */}
      <ConfirmModal
        isOpen={confirmRegenerateOpen}
        onClose={() => setConfirmRegenerateOpen(false)}
        onConfirm={handleConfirmSandboxRegenerate}
        title="Regenerate Sandbox API Keys?"
        description={`Apakah Anda yakin ingin memperbarui Public & Secret Keys Sandbox untuk ${selectedAppForRegen?.name}? Kunci tes lama akan langsung digantikan.`}
        confirmText="Ya, Reset Key Sandbox"
        cancelText="Batal"
        type="warning"
        loading={actionLoading}
      />

      {/* MODAL 6: CONFIRM REVOKE KEY */}
      <ConfirmModal
        isOpen={confirmRevokeOpen}
        onClose={() => setConfirmRevokeOpen(false)}
        onConfirm={handleConfirmRevoke}
        title={selectedAppForRevoke?.isActive ? `Revoke / Nonaktifkan Key ${selectedAppForRevoke?.name}?` : `Aktifkan Kembali Key ${selectedAppForRevoke?.name}?`}
        description={
          selectedAppForRevoke?.isActive
            ? `Kunci API untuk "${selectedAppForRevoke?.name}" akan dinonaktifkan seketika. Semua request pembuatan payment dari backend client menggunakan key ini akan ditolak (403 Forbidden).`
            : `Kunci API untuk "${selectedAppForRevoke?.name}" akan dipulihkan dan dapat kembali memproses transaksi pembayaran.`
        }
        confirmText={selectedAppForRevoke?.isActive ? 'Ya, Revoke API Key' : 'Ya, Aktifkan Kembali'}
        cancelText="Batal"
        type={selectedAppForRevoke?.isActive ? 'danger' : 'info'}
        loading={actionLoading}
      />

      {/* MODAL 7: CONFIRM DELETE APP */}
      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title={`Hapus Aplikasi "${selectedAppForDelete?.name}"?`}
        description={`Aplikasi "${selectedAppForDelete?.name}" beserta seluruh kredensial API Key dan riwayat log webhook akan dihapus secara permanen dari sistem. Tindakan ini TIDAK DAPAT DIBATALKAN.`}
        confirmText="Hapus Permanen"
        cancelText="Batal"
        type="danger"
        loading={actionLoading}
      />

      {/* CREATE NEW APP MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-amber-200 shadow-gold-lg space-y-4">
            
            <div className="flex justify-between items-start border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">Integrasikan Aplikasi Baru</h3>
                <p className="text-xs text-zinc-400">Terbitkan Public & Secret Keys baru</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Mode Banner Indicator */}
            <div
              className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
                isProduction
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}
            >
              {isProduction ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <FlaskConical className="w-4 h-4 text-slate-600 shrink-0" />
              )}
              <span>
                Membuat key untuk mode <strong>{isProduction ? 'Live Production (sg_live_*)' : 'Sandbox Test (sg_test_*)'}</strong>
              </span>
            </div>

            <form onSubmit={handleCreateApp} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Nama Aplikasi</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SendaGo Topup, Platform Kursus"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Deskripsi Singkat</label>
                <input
                  type="text"
                  placeholder="Contoh: Sistem pembayaran checkout course"
                  value={newAppDesc}
                  onChange={(e) => setNewAppDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Webhook URL Klien (Opsional)</label>
                <input
                  type="url"
                  placeholder="https://app-kamu.com/api/webhooks/sendago"
                  value={newAppWebhook}
                  onChange={(e) => setNewAppWebhook(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-mono"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  URL ini akan menerima event payment.success yang ditandatangani dengan HMAC-SHA256.
                </p>
              </div>

              <div className="pt-3 flex gap-2 justify-end border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-zinc-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-sm transition ${
                    isProduction
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                      : 'bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800'
                  }`}
                >
                  {creating ? 'Membuat...' : 'Buat & Generate Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
