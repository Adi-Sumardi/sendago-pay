'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  Check,
  Building2,
  X,
  Sparkles,
  Smartphone,
  Landmark,
  ShieldCheck,
} from 'lucide-react';

export interface BankOption {
  code: string;
  name: string;
  shortName: string;
  category: 'Nasional' | 'Digital' | 'Syariah' | 'BPD';
  color: string;
}

export const INDONESIAN_BANKS: BankOption[] = [
  // Bank Nasional Komersial
  { code: 'BCA', name: 'Bank Central Asia', shortName: 'BCA', category: 'Nasional', color: 'bg-blue-600' },
  { code: 'MANDIRI', name: 'Bank Mandiri', shortName: 'Mandiri', category: 'Nasional', color: 'bg-indigo-700' },
  { code: 'BRI', name: 'Bank Rakyat Indonesia', shortName: 'BRI', category: 'Nasional', color: 'bg-blue-800' },
  { code: 'BNI', name: 'Bank Negara Indonesia', shortName: 'BNI', category: 'Nasional', color: 'bg-teal-700' },
  { code: 'CIMB', name: 'Bank CIMB Niaga', shortName: 'CIMB Niaga', category: 'Nasional', color: 'bg-red-700' },
  { code: 'PERMATA', name: 'Bank Permata', shortName: 'Permata', category: 'Nasional', color: 'bg-emerald-700' },
  { code: 'DANAMON', name: 'Bank Danamon', shortName: 'Danamon', category: 'Nasional', color: 'bg-amber-600' },
  { code: 'BTN', name: 'Bank Tabungan Negara', shortName: 'BTN', category: 'Nasional', color: 'bg-blue-900' },
  { code: 'PANIN', name: 'Bank Panin', shortName: 'Panin', category: 'Nasional', color: 'bg-red-600' },
  { code: 'OCBC', name: 'Bank OCBC NISP', shortName: 'OCBC', category: 'Nasional', color: 'bg-red-800' },
  { code: 'MAYBANK', name: 'Bank Maybank Indonesia', shortName: 'Maybank', category: 'Nasional', color: 'bg-amber-500' },
  { code: 'MEGA', name: 'Bank Mega', shortName: 'Mega', category: 'Nasional', color: 'bg-orange-600' },
  { code: 'SINARMAS', name: 'Bank Sinarmas', shortName: 'Sinarmas', category: 'Nasional', color: 'bg-red-500' },
  { code: 'BUKOPIN', name: 'KB Bank (Bank Bukopin)', shortName: 'KB Bank', category: 'Nasional', color: 'bg-yellow-600' },
  { code: 'UOB', name: 'Bank UOB Indonesia', shortName: 'UOB', category: 'Nasional', color: 'bg-blue-950' },
  { code: 'HSBC', name: 'Bank HSBC Indonesia', shortName: 'HSBC', category: 'Nasional', color: 'bg-red-700' },
  { code: 'DBS', name: 'Bank DBS Indonesia', shortName: 'DBS', category: 'Nasional', color: 'bg-red-600' },
  { code: 'BTPN', name: 'Bank BTPN', shortName: 'BTPN', category: 'Nasional', color: 'bg-orange-700' },
  { code: 'COMMONWEALTH', name: 'Bank Commonwealth', shortName: 'Commonwealth', category: 'Nasional', color: 'bg-yellow-500' },
  { code: 'NOBU', name: 'Bank Nationalnobu (Nobu Bank)', shortName: 'Nobu Bank', category: 'Nasional', color: 'bg-blue-600' },
  { code: 'MNC', name: 'MNC Bank', shortName: 'MNC Bank', category: 'Nasional', color: 'bg-blue-700' },

  // Bank Digital & Neobank
  { code: 'JAGO', name: 'Bank Jago', shortName: 'Jago', category: 'Digital', color: 'bg-amber-500' },
  { code: 'SEABANK', name: 'SeaBank Indonesia', shortName: 'SeaBank', category: 'Digital', color: 'bg-orange-600' },
  { code: 'NEO', name: 'Bank Neo Commerce (BNC / Neobank)', shortName: 'Neobank', category: 'Digital', color: 'bg-yellow-500' },
  { code: 'ALLO', name: 'Allo Bank Indonesia', shortName: 'Allo Bank', category: 'Digital', color: 'bg-purple-700' },
  { code: 'BLU', name: 'Blu by BCA Digital', shortName: 'Blu BCA', category: 'Digital', color: 'bg-cyan-600' },
  { code: 'JENIUS', name: 'Jenius (Bank BTPN)', shortName: 'Jenius', category: 'Digital', color: 'bg-cyan-700' },
  { code: 'LINE', name: 'Line Bank (KEB Hana)', shortName: 'Line Bank', category: 'Digital', color: 'bg-emerald-600' },
  { code: 'TMRW', name: 'TMRW by UOB', shortName: 'TMRW', category: 'Digital', color: 'bg-blue-600' },
  { code: 'DIGIBANK', name: 'Digibank by DBS', shortName: 'Digibank', category: 'Digital', color: 'bg-red-600' },
  { code: 'ALADIN', name: 'Bank Aladin Syariah', shortName: 'Aladin', category: 'Digital', color: 'bg-purple-600' },
  { code: 'KROM', name: 'Krom Bank Indonesia', shortName: 'Krom Bank', category: 'Digital', color: 'bg-indigo-600' },
  { code: 'SUPERBANK', name: 'Superbank Indonesia', shortName: 'Superbank', category: 'Digital', color: 'bg-violet-700' },
  { code: 'RAYA', name: 'Bank Raya Indonesia (BRI Agro)', shortName: 'Bank Raya', category: 'Digital', color: 'bg-blue-600' },

  // Bank Syariah
  { code: 'BSI', name: 'Bank Syariah Indonesia', shortName: 'BSI', category: 'Syariah', color: 'bg-teal-600' },
  { code: 'MUAMALAT', name: 'Bank Muamalat Indonesia', shortName: 'Muamalat', category: 'Syariah', color: 'bg-purple-800' },
  { code: 'BCA_SYARIAH', name: 'BCA Syariah', shortName: 'BCA Syariah', category: 'Syariah', color: 'bg-blue-700' },
  { code: 'MEGA_SYARIAH', name: 'Bank Mega Syariah', shortName: 'Mega Syariah', category: 'Syariah', color: 'bg-orange-700' },
  { code: 'BUKOPIN_SYARIAH', name: 'Bank KB Bukopin Syariah', shortName: 'Bukopin Syariah', category: 'Syariah', color: 'bg-emerald-800' },

  // Bank Pembangunan Daerah (BPD)
  { code: 'DKI', name: 'Bank DKI Jakarta', shortName: 'Bank DKI', category: 'BPD', color: 'bg-red-700' },
  { code: 'BJB', name: 'Bank BJB (Jawa Barat & Banten)', shortName: 'Bank BJB', category: 'BPD', color: 'bg-blue-700' },
  { code: 'JATENG', name: 'Bank Jateng (Jawa Tengah)', shortName: 'Bank Jateng', category: 'BPD', color: 'bg-red-800' },
  { code: 'JATIM', name: 'Bank Jatim (Jawa Timur)', shortName: 'Bank Jatim', category: 'BPD', color: 'bg-red-600' },
  { code: 'SUMUT', name: 'Bank Sumut', shortName: 'Bank Sumut', category: 'BPD', color: 'bg-blue-800' },
  { code: 'NAGARI', name: 'Bank Nagari (Sumatera Barat)', shortName: 'Bank Nagari', category: 'BPD', color: 'bg-emerald-700' },
  { code: 'RIAU_KEPRI', name: 'Bank Riau Kepri Syariah', shortName: 'BRK Syariah', category: 'BPD', color: 'bg-emerald-800' },
  { code: 'SUMSEL_BABEL', name: 'Bank Sumsel Babel', shortName: 'Sumsel Babel', category: 'BPD', color: 'bg-blue-900' },
  { code: 'LAMPUNG', name: 'Bank Lampung', shortName: 'Bank Lampung', category: 'BPD', color: 'bg-teal-800' },
  { code: 'KALSEL', name: 'Bank Kalsel', shortName: 'Bank Kalsel', category: 'BPD', color: 'bg-blue-700' },
  { code: 'KALBAR', name: 'Bank Kalbar', shortName: 'Bank Kalbar', category: 'BPD', color: 'bg-emerald-700' },
  { code: 'KALTIMTARA', name: 'Bank Kaltimtara', shortName: 'Kaltimtara', category: 'BPD', color: 'bg-blue-800' },
  { code: 'SULSELBAR', name: 'Bank Sulselbar', shortName: 'Sulselbar', category: 'BPD', color: 'bg-blue-900' },
  { code: 'SULUTGO', name: 'Bank SulutGo', shortName: 'SulutGo', category: 'BPD', color: 'bg-teal-700' },
  { code: 'BALI', name: 'Bank BPD Bali', shortName: 'BPD Bali', category: 'BPD', color: 'bg-yellow-700' },
  { code: 'NTB_SYARIAH', name: 'Bank NTB Syariah', shortName: 'NTB Syariah', category: 'BPD', color: 'bg-emerald-700' },
  { code: 'NTT', name: 'Bank NTT', shortName: 'Bank NTT', category: 'BPD', color: 'bg-blue-700' },
  { code: 'PAPUA', name: 'Bank Papua', shortName: 'Bank Papua', category: 'BPD', color: 'bg-blue-900' },
  { code: 'ACEH', name: 'Bank Aceh Syariah', shortName: 'Bank Aceh', category: 'BPD', color: 'bg-emerald-800' },
];

interface BankSelectProps {
  value: string;
  onChange: (bankCode: string) => void;
  label?: string;
  disabled?: boolean;
}

export function BankSelect({
  value,
  onChange,
  label = 'Nama Bank Penampung',
  disabled = false,
}: BankSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected bank object
  const selectedBank = useMemo(() => {
    const found = INDONESIAN_BANKS.find(
      (b) => b.code.toUpperCase() === value?.toUpperCase() || b.name.toLowerCase().includes(value?.toLowerCase())
    );
    return found || INDONESIAN_BANKS[0]; // Default BCA
  }, [value]);

  // Filtered banks based on search query & category
  const filteredBanks = useMemo(() => {
    return INDONESIAN_BANKS.filter((b) => {
      // Category filter
      if (selectedCategory !== 'ALL' && b.category !== selectedCategory) {
        return false;
      }
      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        b.name.toLowerCase().includes(q) ||
        b.shortName.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedCategory]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto focus search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (bank: BankOption) => {
    onChange(bank.code);
    setIsOpen(false);
    setSearchQuery('');
  };

  const categories = [
    { label: 'Semua', value: 'ALL', count: INDONESIAN_BANKS.length },
    { label: 'Nasional', value: 'Nasional' },
    { label: 'Digital', value: 'Digital' },
    { label: 'Syariah', value: 'Syariah' },
    { label: 'Daerah BPD', value: 'BPD' },
  ];

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-zinc-400 font-normal">
            {INDONESIAN_BANKS.length} Bank Terdaftar
          </span>
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 bg-stone-50 hover:bg-stone-100/80 border rounded-xl flex items-center justify-between text-xs transition-all duration-200 focus:outline-none ${
          isOpen
            ? 'border-amber-400 ring-2 ring-amber-200/50 bg-white shadow-gold-sm'
            : 'border-stone-200 hover:border-stone-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs ${selectedBank.color}`}
          >
            {selectedBank.shortName.substring(0, 3).toUpperCase()}
          </div>
          <div className="text-left min-w-0">
            <div className="font-bold text-zinc-900 truncate text-xs flex items-center gap-1.5">
              <span>{selectedBank.name}</span>
              <span className="text-[10px] font-mono text-zinc-400">({selectedBank.code})</span>
            </div>
            <div className="text-[10px] text-zinc-400 truncate">
              Kategori: {selectedBank.category}
            </div>
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-amber-600' : ''
          }`}
        />
      </button>

      {/* SEARCHABLE DROPDOWN POPOVER */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white rounded-2xl border border-amber-200/90 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Search Input Bar */}
          <div className="p-3 border-b border-stone-100 bg-stone-50/50 space-y-2">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama bank (BCA, Mandiri, Jago, BSI, BJB)..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 text-zinc-800 placeholder:text-zinc-400 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-zinc-400 hover:text-zinc-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-semibold no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition ${
                    selectedCategory === cat.value
                      ? 'bg-amber-600 text-white font-bold shadow-2xs'
                      : 'bg-stone-200/60 text-zinc-600 hover:bg-stone-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bank Items List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-stone-100/60 p-1">
            {filteredBanks.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 space-y-1">
                <Building2 className="w-8 h-8 mx-auto text-zinc-300 stroke-[1.5]" />
                <p className="font-semibold text-zinc-600">Bank tidak ditemukan</p>
                <p className="text-[11px]">Coba cari dengan kata kunci nama atau kode bank lain.</p>
              </div>
            ) : (
              filteredBanks.map((bank) => {
                const isSelected = selectedBank.code === bank.code;
                return (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => handleSelect(bank)}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-left text-xs transition ${
                      isSelected
                        ? 'bg-amber-50/90 text-amber-950 font-bold border border-amber-200/70'
                        : 'hover:bg-stone-50 text-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs ${bank.color}`}
                      >
                        {bank.shortName.substring(0, 3).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-zinc-900 truncate">{bank.name}</span>
                          <span className="text-[10px] font-mono text-zinc-400">({bank.code})</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-normal">
                          {bank.category}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="px-3 py-2 bg-stone-50/80 border-t border-stone-100 text-[10px] text-zinc-400 flex items-center justify-between">
            <span>Menampilkan {filteredBanks.length} dari {INDONESIAN_BANKS.length} bank</span>
            <span className="font-semibold text-amber-700">ESC untuk menutup</span>
          </div>

        </div>
      )}
    </div>
  );
}
