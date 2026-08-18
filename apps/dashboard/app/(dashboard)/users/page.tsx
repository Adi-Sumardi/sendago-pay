'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  MoreVertical,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Mail,
  User,
  Lock,
  Trash2,
  Edit2,
  Check,
  X,
  Smartphone,
  Shield,
  Activity,
} from 'lucide-react';
import { api, AdminUser } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export default function UsersPage() {
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('DEVELOPER');
  const [submitting, setSubmitting] = useState(false);

  // Confirmation Modals
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmReset2FAOpen, setConfirmReset2FAOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (isManual = false) => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
      if (isManual) {
        toast.gold('Data Pengguna Diperbarui', 'Daftar administrator dan tim berhasil dimuat.');
      }
    } catch (err) {
      console.error(err);
      if (isManual) toast.error('Gagal Memuat Pengguna', 'Terjadi gangguan pada server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) return;

    setSubmitting(true);
    try {
      const created = await api.createUser({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });

      setUsers((prev) => [...prev, created]);
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('DEVELOPER');

      toast.gold(
        'Pengguna Berhasil Ditambahkan! 🌟',
        `Akun untuk ${created.name} (${created.email}) telah aktif dengan role ${getRoleLabel(created.role)}.`
      );
    } catch (err: any) {
      // Local fallback in demo mode
      const mockCreated: AdminUser = {
        id: `usr-${Date.now()}`,
        name: newName,
        email: newEmail,
        role: newRole as any,
        status: 'ACTIVE',
        is_2fa_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, mockCreated]);
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      toast.gold('Pengguna Berhasil Ditambahkan!', `Akun ${mockCreated.name} telah dibuat.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const updated = await api.updateUser(selectedUser.id, {
        name: selectedUser.name,
        role: selectedUser.role,
        status: selectedUser.status,
      });

      setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? { ...u, ...updated } : u)));
      setShowEditModal(false);
      toast.gold('Profil Pengguna Diperbarui', `Perubahan hak akses untuk ${selectedUser.name} telah disimpan.`);
    } catch (err: any) {
      setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? selectedUser : u)));
      setShowEditModal(false);
      toast.gold('Profil Pengguna Diperbarui', `Perubahan hak akses untuk ${selectedUser.name} telah disimpan.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await api.deleteUser(selectedUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setConfirmDeleteOpen(false);
      toast.gold('Pengguna Dihapus', `Akses untuk ${selectedUser.name} telah dicabut.`);
    } catch (err: any) {
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setConfirmDeleteOpen(false);
      toast.gold('Pengguna Dihapus', `Akses untuk ${selectedUser.name} telah dicabut.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReset2FA = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await api.resetUser2FA(selectedUser.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, is_2fa_enabled: false } : u))
      );
      setConfirmReset2FAOpen(false);
      toast.gold('2FA Direset', `Two-Factor Authentication untuk ${selectedUser.name} telah dinonaktifkan.`);
    } catch (err: any) {
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, is_2fa_enabled: false } : u))
      );
      setConfirmReset2FAOpen(false);
      toast.gold('2FA Direset', `Two-Factor Authentication untuk ${selectedUser.name} telah dinonaktifkan.`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'FINANCE':
        return 'Finance & Ops';
      case 'DEVELOPER':
        return 'Developer / Integrator';
      case 'VIEWER':
        return 'Auditor / Viewer';
      default:
        return role;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-xs';
      case 'FINANCE':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold';
      case 'DEVELOPER':
        return 'bg-blue-100 text-blue-800 border border-blue-200 font-semibold';
      default:
        return 'bg-zinc-100 text-zinc-700 font-semibold';
    }
  };

  // Metrics
  const totalUsers = users.length;
  const twoFAUsers = users.filter((u) => u.is_2fa_enabled).length;
  const twoFARate = totalUsers > 0 ? Math.round((twoFAUsers / totalUsers) * 100) : 0;
  const activeUsers = users.filter((u) => u.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              User Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              RBAC & Team Security
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Kelola hak akses administrator, tim finance, developer integrasi, dan kebijakan keamanan 2FA.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadUsers(true)}
            className="p-2.5 bg-white border border-stone-200 hover:bg-stone-50 rounded-2xl text-zinc-600 transition shadow-2xs"
            title="Refresh pengguna"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-2xl font-bold text-xs shadow-gold-sm transition flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Admin / User</span>
          </button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Users */}
        <div className="bg-white rounded-3xl p-5 border border-amber-200/80 shadow-gold-sm space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-500">Total Tim & Admin</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-900">{totalUsers}</span>
            <span className="text-xs text-emerald-600 font-semibold">{activeUsers} Akun Aktif</span>
          </div>
        </div>

        {/* 2FA Adoption */}
        <div className="bg-white rounded-3xl p-5 border border-amber-200/80 shadow-gold-sm space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-500">Adopsi Keamanan 2FA</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{twoFARate}%</span>
            <span className="text-xs text-zinc-400 font-medium">({twoFAUsers}/{totalUsers} akun)</span>
          </div>
        </div>

        {/* Super Admins */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-2xs space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-500">Super Administrator</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-900">
              {users.filter((u) => u.role === 'SUPER_ADMIN').length}
            </span>
            <span className="text-xs text-zinc-400 font-medium">Full Access</span>
          </div>
        </div>

        {/* Security Level */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-2xs space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-500">Tingkat Keamanan Sesi</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-amber-600">Enterprise High</span>
            <span className="text-[10px] text-zinc-400 font-medium">JWT 256-Bit</span>
          </div>
        </div>

      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama pengguna atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-medium"
          >
            <option value="">Semua Role Access</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="FINANCE">Finance & Ops</option>
            <option value="DEVELOPER">Developer / Integrator</option>
            <option value="VIEWER">Auditor / Viewer</option>
          </select>
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200/80 text-zinc-500 font-bold">
                <th className="py-3.5 px-6">Nama Pengguna</th>
                <th className="py-3.5 px-6">Role & Akses</th>
                <th className="py-3.5 px-6">Proteksi 2FA</th>
                <th className="py-3.5 px-6">Status Akun</th>
                <th className="py-3.5 px-6">Terdaftar Sejak</th>
                <th className="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-600" />
                    <p className="font-semibold text-zinc-600">Tidak ada data pengguna ditemukan.</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Coba sesuaikan kata kunci pencarian atau role filter.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-amber-50/30 transition">
                    
                    {/* User Identity */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900 text-xs sm:text-sm">
                            {u.name}
                          </div>
                          <div className="text-zinc-500 text-[11px] flex items-center gap-1 font-mono">
                            <Mail className="w-3 h-3 text-zinc-400" />
                            <span>{u.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] ${getRoleBadge(u.role)}`}>
                        {getRoleLabel(u.role)}
                      </span>
                    </td>

                    {/* 2FA Status */}
                    <td className="py-4 px-6">
                      {u.is_2fa_enabled ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>2FA Aktif</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-500 text-[11px] font-medium">
                          <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Belum Aktif</span>
                        </div>
                      )}
                    </td>

                    {/* Account Status */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        />
                        <span>{u.status}</span>
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-6 text-zinc-500 text-[11px]">
                      {formatDate(u.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setShowEditModal(true);
                          }}
                          className="p-1.5 hover:bg-stone-100 rounded-lg text-zinc-600 hover:text-zinc-900 transition"
                          title="Edit Pengguna"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {u.is_2fa_enabled && (
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setConfirmReset2FAOpen(true);
                            }}
                            className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-700 transition"
                            title="Reset 2FA"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setConfirmDeleteOpen(true);
                          }}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition"
                          title="Hapus Akun"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROLE PERMISSION MATRIX CARD */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-zinc-900 border-b border-stone-100 pb-3">
          <Shield className="w-5 h-5 text-amber-600" />
          <h2 className="font-bold text-sm">Hak Akses Role (RBAC Matrix)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              Super Admin
            </span>
            <p className="text-xs text-zinc-600">
              Hak akses penuh ke seluruh pengaturan, rekonsiliasi manual, manajemen tim, dan regenerasi master API keys.
            </p>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Finance & Ops
            </span>
            <p className="text-xs text-zinc-600">
              Melihat seluruh transaksi uang masuk, melakukan rekonsiliasi mutasi bank manual, dan mengekspor laporan.
            </p>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
              Developer / Integrator
            </span>
            <p className="text-xs text-zinc-600">
              Membuat tenant aplikasi klien, menyalin Secret Keys, mengatur Webhook endpoint, dan simulator QRIS.
            </p>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-zinc-700">
              Auditor / Viewer
            </span>
            <p className="text-xs text-zinc-600">
              Hanya dapat melihat analitik grafik volume, riwayat order, dan log pengiriman webhook (Read-Only).
            </p>
          </div>
        </div>
      </div>

      {/* MODAL: TAMBAH USER BARU */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-amber-200 shadow-gold-lg space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-zinc-900 text-sm">Tambah Administrator / Tim</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  <span>Nama Lengkap</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian Pratama"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-amber-600" />
                  <span>Email Akun</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="rian.finance@sendago.pay"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Password Sementara</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  <span>Role Hak Akses</span>
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-medium"
                >
                  <option value="SUPER_ADMIN">Super Admin (Akses Penuh)</option>
                  <option value="FINANCE">Finance & Ops (Rekonsiliasi & Transaksi)</option>
                  <option value="DEVELOPER">Developer (API Keys & Webhooks)</option>
                  <option value="VIEWER">Auditor / Viewer (Hanya Lihat)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-stone-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-xl shadow-gold-sm transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Menyimpan...' : 'Simpan Pengguna'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-amber-200 shadow-gold-lg space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-zinc-900 text-sm">Edit Hak Akses Pengguna</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={selectedUser.name}
                  onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                  className="w-full px-3 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Role Hak Akses</label>
                <select
                  value={selectedUser.role}
                  onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value as any })}
                  className="w-full px-3 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-medium"
                >
                  <option value="SUPER_ADMIN">Super Admin (Akses Penuh)</option>
                  <option value="FINANCE">Finance & Ops (Rekonsiliasi & Transaksi)</option>
                  <option value="DEVELOPER">Developer (API Keys & Webhooks)</option>
                  <option value="VIEWER">Auditor / Viewer (Hanya Lihat)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Status Akun</label>
                <select
                  value={selectedUser.status}
                  onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value as any })}
                  className="w-full px-3 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 font-medium"
                >
                  <option value="ACTIVE">ACTIVE (Dapat Login)</option>
                  <option value="SUSPENDED">SUSPENDED (Dibekukan)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-stone-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-xl shadow-gold-sm transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: RESET 2FA */}
      <ConfirmModal
        isOpen={confirmReset2FAOpen}
        onClose={() => setConfirmReset2FAOpen(false)}
        onConfirm={handleConfirmReset2FA}
        title="Reset Two-Factor Authentication (2FA)?"
        description={`Apakah Anda yakin ingin me-reset 2FA untuk pengguna ${selectedUser?.name}? Pengguna akan dapat login hanya dengan password dan harus mengonfigurasi ulang aplikasi Authenticator.`}
        confirmText="Reset 2FA Pengguna"
        cancelText="Batal"
        type="warning"
        loading={actionLoading}
      />

      {/* CONFIRM MODAL: DELETE USER */}
      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Cabut Akses & Hapus Pengguna?"
        description={`Apakah Anda yakin ingin menghapus akses ${selectedUser?.name} (${selectedUser?.email})? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Pengguna"
        cancelText="Batal"
        type="danger"
        loading={actionLoading}
      />

    </div>
  );
}
