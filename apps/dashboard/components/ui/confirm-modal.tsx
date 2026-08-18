'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, HelpCircle, X, ShieldAlert } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'gold';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  type = 'gold',
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-amber-200 shadow-gold-lg space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden">
        
        {/* Top Accent Stripe */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 ${
            type === 'danger'
              ? 'bg-gradient-to-r from-red-500 to-rose-600'
              : type === 'warning'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
              : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400'
          }`}
        />

        <div className="flex items-start gap-4 pt-1">
          {/* Icon Badge */}
          <div
            className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center ${
              type === 'danger'
                ? 'bg-red-50 text-red-600 border border-red-200 shadow-sm shadow-red-200/50'
                : type === 'warning'
                ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm shadow-amber-200/50'
                : 'bg-amber-50 text-amber-600 border border-amber-200 shadow-sm shadow-amber-200/50'
            }`}
          >
            {type === 'danger' && <AlertCircle className="w-6 h-6" />}
            {type === 'warning' && <AlertTriangle className="w-6 h-6" />}
            {type === 'gold' && <ShieldAlert className="w-6 h-6" />}
            {type === 'info' && <HelpCircle className="w-6 h-6" />}
          </div>

          <div className="space-y-1 flex-1 pr-2">
            <h3 className="font-bold text-zinc-900 text-base leading-snug">
              {title}
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {description}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1 rounded-xl hover:bg-zinc-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              onConfirm();
            }}
            className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center gap-1.5 ${
              type === 'danger'
                ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-200'
            }`}
          >
            <span>{loading ? 'Memproses...' : confirmText}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
