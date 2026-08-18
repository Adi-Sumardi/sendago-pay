'use client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

// Dashboard auth (JWT) covers signup/login/merchant/api-key/webhook management.
// Payment Links/Invoices/Settlement/Reports reuse the merchant's own sandbox API key
// against the same public integration surface an external developer would call.
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sendago_token');
}
export function setToken(token: string) {
  localStorage.setItem('sendago_token', token);
}
export function clearSession() {
  localStorage.removeItem('sendago_token');
  localStorage.removeItem('sendago_active_api_key');
  localStorage.removeItem('sendago_merchant_id');
}
export function getActiveApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sendago_active_api_key');
}
export function setActiveApiKey(key: string) {
  localStorage.setItem('sendago_active_api_key', key);
}
export function getActiveMerchantId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sendago_merchant_id');
}
export function setActiveMerchantId(id: string) {
  localStorage.setItem('sendago_merchant_id', id);
}

async function request(path: string, options: RequestInit & { auth?: 'jwt' | 'apikey' | 'none' } = {}) {
  const { auth = 'jwt', headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (auth === 'jwt') {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  } else if (auth === 'apikey') {
    const key = getActiveApiKey();
    if (key) finalHeaders.Authorization = `Bearer ${key}`;
    finalHeaders['X-Environment'] = 'sandbox';
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...rest, headers: finalHeaders });
  const contentType = res.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = typeof body === 'object' && body?.message ? body.message : `Request failed (${res.status})`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  return body;
}

export const api = {
  signup: (email: string, password: string) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }), auth: 'none' }),
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }), auth: 'none' }),

  listMerchants: () => request('/merchants'),
  createMerchant: (businessName: string) => request('/merchants', { method: 'POST', body: JSON.stringify({ businessName }) }),

  issueApiKey: (merchantId: string, environment: 'sandbox' | 'production') =>
    request(`/merchants/${merchantId}/api-keys`, { method: 'POST', body: JSON.stringify({ environment }) }),
  listApiKeys: (merchantId: string) => request(`/merchants/${merchantId}/api-keys`),
  revokeApiKey: (merchantId: string, apiKeyId: string) =>
    request(`/merchants/${merchantId}/api-keys/${apiKeyId}`, { method: 'DELETE' }),

  registerWebhook: (merchantId: string, environment: string, url: string) =>
    request(`/merchants/${merchantId}/webhooks`, { method: 'POST', body: JSON.stringify({ environment, url }) }),
  listWebhooks: (merchantId: string, environment: string) =>
    request(`/merchants/${merchantId}/webhooks?environment=${environment}`),

  createPaymentLink: (params: { title: string; description: string; amount: string; currency: string }) =>
    request('/payment-links', { method: 'POST', auth: 'apikey', body: JSON.stringify(params) }),
  listPaymentLinks: () => request('/payment-links', { auth: 'apikey' }),

  createInvoice: (params: any) => request('/invoices', { method: 'POST', auth: 'apikey', body: JSON.stringify(params) }),
  listInvoices: () => request('/invoices', { auth: 'apikey' }),
  cancelInvoice: (id: string) => request(`/invoices/${id}/cancel`, { method: 'POST', auth: 'apikey' }),

  getBalance: () => request('/settlements/balance', { auth: 'apikey' }),
  getReportSummary: () => request('/reports/transactions/summary', { auth: 'apikey' }),

  // Public, unauthenticated checkout endpoints.
  getPaymentLinkPublic: (slug: string) => request(`/pay/${slug}`, { auth: 'none' }),
  checkoutPaymentLink: (slug: string, params: { customerName: string; customerEmail: string; finishUrl: string }) =>
    request(`/pay/${slug}/checkout`, { method: 'POST', auth: 'none', body: JSON.stringify(params) }),
  getInvoicePublic: (id: string) => request(`/invoice/${id}`, { auth: 'none' }),
  checkoutInvoice: (id: string, finishUrl: string) =>
    request(`/invoice/${id}/checkout`, { method: 'POST', auth: 'none', body: JSON.stringify({ finishUrl }) }),
};
