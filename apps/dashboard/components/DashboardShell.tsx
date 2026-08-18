'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getToken, clearSession, getActiveMerchantId } from '../lib/api-client';

const NAV_ITEMS = [
  { href: '/links', label: 'Payment Links' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/transactions', label: 'Transactions & Balance' },
  { href: '/api-keys', label: 'API Keys' },
  { href: '/webhooks-settings', label: 'Webhooks' },
  { href: '/settings', label: 'Settings' },
];

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  const merchantId = getActiveMerchantId();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-gray-200 bg-white p-4 flex flex-col">
        <div className="font-semibold text-lg mb-6">SendaGo Payment</div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded px-3 py-2 text-sm ${
                pathname === item.href ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {!merchantId && (
          <Link href="/settings" className="text-xs text-amber-600 mb-2">
            No merchant selected
          </Link>
        )}
        <button
          onClick={() => {
            clearSession();
            router.replace('/login');
          }}
          className="text-sm text-gray-500 hover:text-gray-800 text-left"
        >
          Log out
        </button>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
