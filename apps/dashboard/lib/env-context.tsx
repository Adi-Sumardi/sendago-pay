'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';

export type AppEnvironment = 'production' | 'sandbox';

interface EnvironmentContextType {
  environment: AppEnvironment;
  isProduction: boolean;
  isSandbox: boolean;
  mounted: boolean;
  setEnvironment: (env: AppEnvironment) => void;
  toggleEnvironment: () => void;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [environment, setEnvState] = useState<AppEnvironment>('production');
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    try {
      const savedEnv = localStorage.getItem('sendago_environment') as AppEnvironment;
      if (savedEnv === 'production' || savedEnv === 'sandbox') {
        setEnvState(savedEnv);
      }
    } catch (e) {
      console.error('Failed to read environment from localStorage:', e);
    }
  }, []);

  const setEnvironment = (newEnv: AppEnvironment) => {
    setEnvState(newEnv);
    try {
      localStorage.setItem('sendago_environment', newEnv);
    } catch (e) {
      console.error('Failed to save environment:', e);
    }

    if (newEnv === 'production') {
      toast.gold(
        'Mode Live Production Aktif 🟢',
        'Anda berada di lingkungan Live. Transaksi, mutasi bank, dan QRIS yang diproses adalah transaksi riil.'
      );
    } else {
      toast.info(
        'Mode Sandbox Test Aktif 🧪',
        'Anda berada di lingkungan Simulasi Sandbox. Semua data & transaksi aman untuk pengujian developer.'
      );
    }
  };

  const toggleEnvironment = () => {
    setEnvironment(environment === 'production' ? 'sandbox' : 'production');
  };

  return (
    <EnvironmentContext.Provider
      value={{
        environment,
        isProduction: environment === 'production',
        isSandbox: environment === 'sandbox',
        mounted,
        setEnvironment,
        toggleEnvironment,
      }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
}
