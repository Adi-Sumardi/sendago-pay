import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';
import { EnvironmentProvider } from '@/lib/env-context';

export const metadata: Metadata = {
  title: 'SendaGo Pay — Payment Gateway & Engine',
  description: 'Self-hosted internal payment gateway with Dynamic QRIS & Bank Mutation Reconciler',
  icons: {
    icon: '/images/logo.png',
    shortcut: '/images/logo.png',
    apple: '/images/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className="min-h-screen bg-white text-zinc-900 antialiased selection:bg-amber-100 selection:text-amber-900"
        suppressHydrationWarning
      >
        <ToastProvider>
          <EnvironmentProvider>
            {children}
          </EnvironmentProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
