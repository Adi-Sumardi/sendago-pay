'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  Layers,
  Settings,
  Users,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  ShieldCheck,
  Zap,
  Menu,
  X,
  Smartphone,
  ExternalLink,
  FlaskConical,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { auth, AuthUser } from '@/lib/auth';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useEnvironment } from '@/lib/env-context';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { environment, isProduction, isSandbox, setEnvironment } = useEnvironment();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const syncUser = () => {
      const currentUser = auth.getUser();
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser({
          id: 'default-admin',
          name: 'Aditya Putra',
          email: 'admin@sendago.pay',
          is_2fa_enabled: false,
        });
      }
    };

    syncUser();

    const handleUserUpdate = (e: any) => {
      if (e?.detail) {
        setUser(e.detail);
      } else {
        syncUser();
      }
    };

    window.addEventListener('sendago_user_updated', handleUserUpdate);
    window.addEventListener('storage', syncUser);

    return () => {
      window.removeEventListener('sendago_user_updated', handleUserUpdate);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleConfirmLogout = () => {
    setLogoutModalOpen(false);
    setMobileMenuOpen(false);
    toast.gold('Sampai Jumpa! 👋', 'Anda telah berhasil keluar dari dashboard.');
    setTimeout(() => {
      auth.logout();
    }, 400);
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, label: 'Overview' },
    { name: 'Transactions', href: '/transactions', icon: Receipt, label: 'Transaksi' },
    { name: 'Connected Apps', href: '/apps', icon: Layers, label: 'Aplikasi' },
    { name: 'User Management', href: '/users', icon: Users, label: 'Tim & User' },
    { name: 'Settings & Security', href: '/settings', icon: Settings, label: 'Pengaturan' },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row selection:bg-amber-100 transition-colors duration-500 ${
        isProduction
          ? 'bg-gradient-to-br from-[#F4FAF5] via-[#FCFDFC] to-[#EEF7F0]'
          : 'bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E8EDF3]'
      }`}
    >
      
      {/* DESKTOP LEFT SIDEBAR */}
      <aside
        className={`w-64 border-r hidden md:flex flex-col justify-between p-4 sticky top-0 h-screen shrink-0 z-30 transition-colors duration-500 ${
          isProduction
            ? 'bg-white/95 border-emerald-100/90 shadow-[4px_0_24px_rgba(16,185,129,0.03)]'
            : 'bg-white/95 border-slate-200 shadow-[4px_0_24px_rgba(100,116,139,0.06)]'
        }`}
      >
        <div className="space-y-6">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3 px-3 py-2 cursor-pointer" onClick={() => router.push('/')}>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm transition-all duration-500 ${
                isProduction
                  ? 'bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 shadow-emerald-200'
                  : 'bg-gradient-to-tr from-slate-700 via-slate-600 to-slate-400 shadow-slate-300'
              }`}
            >
              S
            </div>
            <div>
              <div className="font-extrabold text-zinc-900 tracking-tight text-lg leading-none">
                SendaGo{' '}
                <span className={isProduction ? 'text-emerald-600' : 'text-slate-600'}>
                  Pay
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isProduction ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider ${
                    isProduction ? 'text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  {isProduction ? 'Live Production' : 'Sandbox Test'}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? isProduction
                        ? 'bg-emerald-50/90 text-emerald-900 border border-emerald-200/80 shadow-xs font-bold'
                        : 'bg-slate-100 text-slate-900 border border-slate-300 shadow-xs font-bold'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-stone-50/80'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? isProduction
                          ? 'text-emerald-600'
                          : 'text-slate-700'
                        : 'text-zinc-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout Bottom */}
        <div className="space-y-3 pt-4 border-t border-stone-100">
          <div
            className={`p-3 rounded-2xl border flex items-center justify-between transition-colors ${
              isProduction
                ? 'bg-emerald-50/40 border-emerald-100'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                  isProduction
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                    : 'bg-gradient-to-tr from-slate-600 to-slate-400'
                }`}
              >
                {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AP'}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-zinc-900 truncate">
                  {user?.name || 'Aditya Putra'}
                </div>
                <div className="text-[10px] text-zinc-400 truncate">
                  {user?.email || 'admin@sendago.pay'}
                </div>
              </div>
            </div>

            {user?.is_2fa_enabled && (
              <span title="2FA Aktif">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              </span>
            )}
          </div>

          <button
            onClick={() => setLogoutModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* MOBILE SLIDE-OVER DRAWER MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between p-5 z-10 animate-in slide-in-from-left duration-300">
            <div className="space-y-6">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm ${
                      isProduction
                        ? 'bg-gradient-to-tr from-emerald-600 to-teal-400'
                        : 'bg-gradient-to-tr from-slate-700 to-slate-400'
                    }`}
                  >
                    S
                  </div>
                  <div>
                    <div className="font-extrabold text-zinc-900 text-base leading-none">
                      SendaGo{' '}
                      <span className={isProduction ? 'text-emerald-600' : 'text-slate-600'}>
                        Pay
                      </span>
                    </div>
                    <div
                      className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                        isProduction ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {isProduction ? 'Live Production' : 'Sandbox Test'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-1.5">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        router.push(item.href);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition ${
                        isActive
                          ? isProduction
                            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-xs'
                            : 'bg-slate-100 text-slate-900 border border-slate-300 shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-stone-50'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          isActive
                            ? isProduction
                              ? 'text-emerald-600'
                              : 'text-slate-700'
                            : 'text-zinc-400'
                        }`}
                      />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Mobile User Card & Logout */}
            <div className="space-y-3 pt-4 border-t border-stone-100">
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 ${
                      isProduction
                        ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                        : 'bg-gradient-to-tr from-slate-600 to-slate-400'
                    }`}
                  >
                    {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AP'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-zinc-900 truncate">
                      {user?.name || 'Aditya Putra'}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      {user?.email || 'admin@sendago.pay'}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setLogoutModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Akun</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP ENVIRONMENT NOTICE BANNER FOR SANDBOX */}
        {isSandbox && (
          <div className="bg-slate-900 text-slate-100 px-4 py-1.5 text-[11px] font-semibold flex items-center justify-between border-b border-slate-800 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mx-auto sm:mx-0">
              <FlaskConical className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span>
                <strong>SANDBOX TEST ENVIRONMENT:</strong> Transaksi, mutasi, dan QRIS berada di mode simulasi. Tidak ada uang riil yang ditarik.
              </span>
            </div>
            <button
              onClick={() => setEnvironment('production')}
              className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-0.5 rounded-md transition"
            >
              <span>Beralih ke Live Production</span>
              <CheckCircle2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* TOP NAVBAR */}
        <header
          className={`h-14 sm:h-16 backdrop-blur-md border-b px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-500 ${
            isProduction
              ? 'bg-white/90 border-emerald-100/80 shadow-[0_2px_12px_rgba(16,185,129,0.03)]'
              : 'bg-white/90 border-slate-200/90 shadow-[0_2px_12px_rgba(100,116,139,0.04)]'
          }`}
        >
          
          {/* Mobile Left: Hamburger Button + Brand Title */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 text-zinc-600 hover:text-zinc-900 hover:bg-stone-100 rounded-xl transition"
              aria-label="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="font-black text-zinc-900 text-sm flex items-center gap-1">
              <span>SendaGo</span>
              <span className={isProduction ? 'text-emerald-600' : 'text-slate-600'}>
                Pay
              </span>
            </div>
          </div>

          {/* Environment Switcher Dynamic Pill */}
          <div
            className={`flex items-center gap-1 p-1 rounded-2xl border transition-all duration-300 ${
              isProduction
                ? 'bg-emerald-50/80 border-emerald-200/70 shadow-xs'
                : 'bg-slate-100 border-slate-300 shadow-xs'
            }`}
          >
            {/* Live Production Button */}
            <button
              onClick={() => setEnvironment('production')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-300 ${
                isProduction
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm ring-1 ring-emerald-400/40'
                  : 'text-zinc-500 hover:text-emerald-800 hover:bg-emerald-100/40'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isProduction ? 'bg-emerald-200 animate-pulse' : 'bg-zinc-400'
                }`}
              />
              <span>Live Production</span>
            </button>

            {/* Sandbox Test Button */}
            <button
              onClick={() => setEnvironment('sandbox')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-300 ${
                isSandbox
                  ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-sm ring-1 ring-slate-400/40'
                  : 'text-zinc-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              <FlaskConical
                className={`w-3.5 h-3.5 ${isSandbox ? 'text-amber-400' : 'text-zinc-400'}`}
              />
              <span>Sandbox Test</span>
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Dynamic Status Pill */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1 border rounded-full text-xs font-semibold transition-colors duration-300 ${
                isProduction
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isProduction ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span>{isProduction ? 'Live Gateway Online' : 'Sandbox Simulator Active'}</span>
            </div>

            {/* Logout Header Button for Desktop */}
            <button
              onClick={() => setLogoutModalOpen(true)}
              className="p-1.5 sm:p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <main className="p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 pb-24 md:pb-8">
          {children}
        </main>

        {/* BOTTOM FIXED NAVIGATION BAR FOR MOBILE SMARTPHONES */}
        <nav
          className={`md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-lg border-t px-1 py-1.5 flex items-center justify-around shadow-lg transition-colors duration-500 ${
            isProduction
              ? 'bg-white/95 border-emerald-100'
              : 'bg-white/95 border-slate-200'
          }`}
        >
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition min-w-[56px] ${
                  isActive
                    ? isProduction
                      ? 'text-emerald-700 bg-emerald-50/80 font-black'
                      : 'text-slate-800 bg-slate-100 font-black'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mb-0.5 ${
                    isActive
                      ? isProduction
                        ? 'text-emerald-600 stroke-[2.5]'
                        : 'text-slate-700 stroke-[2.5]'
                      : 'text-zinc-400'
                  }`}
                />
                <span className="truncate max-w-[62px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

      </div>

      {/* LOGOUT CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Keluar dari Dashboard SendaGo Pay?"
        description="Sesi Anda akan diakhiri. Anda perlu memasukkan email, password, dan kode 2FA untuk masuk kembali."
        confirmText="Ya, Keluar Akun"
        cancelText="Batal"
        type="warning"
      />

    </div>
  );
}
