'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'gold';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  action?: ToastAction;
  duration?: number;
  createdAt: number;
}

interface ToastContextValue {
  toast: {
    success: (title: string, description?: string, action?: ToastAction) => void;
    error: (title: string, description?: string, action?: ToastAction) => void;
    info: (title: string, description?: string, action?: ToastAction) => void;
    warning: (title: string, description?: string, action?: ToastAction) => void;
    gold: (title: string, description?: string, action?: ToastAction) => void;
    custom: (item: Omit<ToastItem, 'id' | 'createdAt'>) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, description?: string, action?: ToastAction, duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = {
        id,
        type,
        title,
        description,
        action,
        duration,
        createdAt: Date.now(),
      };

      setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // Keep max 5 visible toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const value: ToastContextValue = {
    toast: {
      success: (title, description, action) => addToast('success', title, description, action, 3800),
      error: (title, description, action) => addToast('error', title, description, action, 5000),
      info: (title, description, action) => addToast('info', title, description, action, 3500),
      warning: (title, description, action) => addToast('warning', title, description, action, 4000),
      gold: (title, description, action) => addToast('gold', title, description, action, 4500),
      custom: (item) => addToast(item.type, item.title, item.description, item.action, item.duration),
    },
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Luxury Floating Toast Stack (Bottom-Right / Top-Right on mobile) */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-3 max-w-sm sm:max-w-md w-full pointer-events-none px-3 sm:px-0">
        {toasts.map((t) => {
          const isGold = t.type === 'gold' || t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';
          const isInfo = t.type === 'info';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 transform translate-y-0 opacity-100 backdrop-blur-xl shadow-2xl ${
                isGold
                  ? 'bg-gradient-to-b from-white/98 via-amber-50/90 to-white/95 border-2 border-amber-300/80 shadow-[0_10px_30px_rgba(212,175,55,0.25)]'
                  : isError
                  ? 'bg-white/98 border-2 border-red-300/80 shadow-[0_10px_30px_rgba(239,68,68,0.20)]'
                  : isWarning
                  ? 'bg-white/98 border-2 border-amber-400/80 shadow-[0_10px_30px_rgba(245,158,11,0.20)]'
                  : 'bg-white/98 border-2 border-sky-300/80 shadow-[0_10px_30px_rgba(14,165,233,0.20)]'
              }`}
              style={{
                animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }}
            >
              {/* Top ambient gold glow streak */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
                  isGold
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500'
                    : isError
                    ? 'bg-gradient-to-r from-red-400 via-rose-500 to-red-600'
                    : isWarning
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                    : 'bg-gradient-to-r from-sky-400 to-blue-500'
                }`}
              />

              <div className="flex items-start gap-3.5 pt-0.5">
                
                {/* Visual Icon Badge */}
                <div className="shrink-0 mt-0.5">
                  {isGold && (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 text-white flex items-center justify-center shadow-md shadow-amber-500/30 ring-2 ring-amber-200/50">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                  )}
                  {isError && (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-md shadow-red-500/30 ring-2 ring-red-200">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  )}
                  {isWarning && (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 ring-2 ring-amber-200">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  )}
                  {isInfo && (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/30 ring-2 ring-sky-200">
                      <Info className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs sm:text-sm text-zinc-900 leading-tight">
                      {t.title}
                    </h4>
                  </div>
                  
                  {t.description && (
                    <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                      {t.description}
                    </p>
                  )}

                  {/* Optional Action Button */}
                  {t.action && (
                    <button
                      onClick={() => {
                        t.action?.onClick();
                        removeToast(t.id);
                      }}
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-100/70 hover:bg-amber-200/80 px-2.5 py-1 rounded-lg transition"
                    >
                      <span>{t.action.label}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition shrink-0"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Countdown Progress Bar */}
              {t.duration && t.duration > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100 overflow-hidden">
                  <div
                    className={`h-full ${
                      isGold
                        ? 'bg-amber-400'
                        : isError
                        ? 'bg-red-400'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-sky-400'
                    }`}
                    style={{
                      animation: `shrinkWidth ${t.duration}ms linear forwards`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes shrinkWidth {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
