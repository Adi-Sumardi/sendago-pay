import { auth } from './auth';

const API_BASE_URL = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export interface PaymentDetails {
  id: string;
  app_id: string;
  app_name?: string;
  order_id: string;
  amount: number;
  unique_code: number;
  total_amount: number;
  channel: 'QRIS' | 'BANK_TRANSFER';
  qris_payload?: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED';
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  redirect_url?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  created_at: string;
  expired_at: string;
  paid_at?: string;
}

export interface SummaryStats {
  total_volume: number;
  successful_count: number;
  pending_count: number;
  success_rate: number;
  active_apps_count: number;
  today_volume: number;
  total_mutations_count: number;
}

export interface AppProfile {
  id: string;
  name: string;
  description?: string;
  public_key: string;
  secret_key: string;
  webhook_url?: string;
  webhook_secret: string;
  is_active: boolean;
  created_at: string;
}

export interface KeyRegenRequest {
  id: string;
  app_id: string;
  app_name: string;
  requested_by: string;
  environment: string;
  reason: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  email_sent: boolean;
  created_at: string;
}

export interface EmailNotificationPreview {
  recipient: string;
  subject: string;
  sender: string;
  mail_server?: string;
  message_id?: string;
  sent_at: string;
  app_name: string;
  new_public_key: string;
  delivery_status: string;
  body_preview: string;
}

export interface WebhookLog {
  id: string;
  app_id: string;
  app_name?: string;
  order_id?: string;
  event: string;
  target_url: string;
  response_status: number;
  attempt_count: number;
  is_success: boolean;
  created_at: string;
}

export interface LoginResponse {
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    is_2fa_enabled: boolean;
  };
  requires_2fa?: boolean;
  temp_token?: string;
  message?: string;
  error?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'FINANCE' | 'DEVELOPER' | 'VIEWER';
  status: 'ACTIVE' | 'SUSPENDED';
  is_2fa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const api = {
  // Authentication & 2FA
  async login(email: string, password: string, totpCode?: string, tempToken?: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, totp_code: totpCode, temp_token: tempToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async setup2FA(): Promise<{ secret: string; otpauth_url: string }> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/2fa/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to setup 2FA');
    return data;
  },

  async verifyAndEnable2FA(secret: string, code: string): Promise<{ status: string; is_2fa_enabled: boolean }> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/2fa/verify-enable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
      body: JSON.stringify({ secret, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to verify 2FA code');
    return data;
  },

  async disable2FA(): Promise<{ status: string; is_2fa_enabled: boolean }> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/2fa/disable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to disable 2FA');
    return data;
  },

  // Public Checkout APIs
  async getPayment(id: string): Promise<PaymentDetails> {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/payments/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Payment not found or expired');
      return res.json();
    } catch {
      // Demo mock fallback
      return {
        id,
        app_id: 'app-default-1',
        app_name: 'SendaGo SaaS Platform',
        order_id: 'ORD-DEMO-001',
        amount: 150000,
        unique_code: 730,
        total_amount: 150730,
        channel: 'QRIS',
        qris_payload: '00020101021126590013ID.CO.GOPAY.WWW01189360091438291039210215ID10200392019010303UMI51440014ID.CO.QRIS.WWW0215ID10200392019010303UMI52045411530336054061507305802ID5911SendaGo Pay6013Jakarta Pusat61051011062070703A0163046D5E',
        status: 'PENDING',
        customer_name: 'Aditya Putra',
        customer_email: 'aditya@example.com',
        created_at: new Date().toISOString(),
        expired_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
    }
  },

  // Admin Dashboard APIs
  async getStats(): Promise<SummaryStats> {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/admin/stats`, {
        cache: 'no-store',
        headers: { ...auth.getAuthHeaders() },
      });
      if (!res.ok) throw new Error('Failed to load stats');
      return res.json();
    } catch {
      return {
        total_volume: 0,
        successful_count: 0,
        pending_count: 0,
        success_rate: 100.0,
        active_apps_count: 0,
        today_volume: 0,
        total_mutations_count: 0,
      };
    }
  },

  async getTransactions(status = '', appId = ''): Promise<PaymentDetails[]> {
    try {
      const params: string[] = [];
      if (status) params.push(`status=${encodeURIComponent(status)}`);
      if (appId) params.push(`app_id=${encodeURIComponent(appId)}`);
      const qs = params.length > 0 ? `?${params.join('&')}` : '';

      const res = await fetch(`${API_BASE_URL}/v1/admin/transactions${qs}`, {
        cache: 'no-store',
        headers: { ...auth.getAuthHeaders() },
      });
      if (!res.ok) throw new Error('Failed to load transactions');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async reconcileTransaction(id: string): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/transactions/${id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reconcile transaction');
    return data;
  },

  async manualReconcile(id: string): Promise<{ status: string }> {
    return this.reconcileTransaction(id);
  },

  async getApps(): Promise<AppProfile[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/admin/apps`, {
        cache: 'no-store',
        headers: { ...auth.getAuthHeaders() },
      });
      if (!res.ok) throw new Error('Failed to load apps');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async createApp(payload: { name: string; description?: string; webhook_url?: string; environment?: string } | string, desc?: string, webhook?: string): Promise<AppProfile> {
    const bodyObj = typeof payload === 'object'
      ? payload
      : { name: payload, description: desc || '', webhook_url: webhook || '' };

    const res = await fetch(`${API_BASE_URL}/v1/admin/apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
      body: JSON.stringify(bodyObj),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create app');
    return data;
  },

  async regenerateKeys(appId: string, env?: string): Promise<AppProfile> {
    const qs = env ? `?env=${encodeURIComponent(env)}` : '';
    const res = await fetch(`${API_BASE_URL}/v1/admin/apps/${appId}/regenerate-keys${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to regenerate keys');
    return data;
  },

  async revokeApp(appId: string, isActive: boolean): Promise<AppProfile> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/apps/${appId}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
      body: JSON.stringify({ is_active: isActive }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update key status');
    return data;
  },

  async deleteApp(appId: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/apps/${appId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete app');
    return data;
  },

  async submitKeyRegenRequest(
    appId: string,
    payload: { reason: string; requested_by: string; notes?: string; environment?: string }
  ): Promise<{ status: string; message: string; request: KeyRegenRequest }> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/apps/${appId}/request-regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengajukan permintaan regenerasi key');
    return data;
  },

  async getKeyRegenRequests(): Promise<KeyRegenRequest[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/admin/key-requests`, {
        cache: 'no-store',
        headers: { ...auth.getAuthHeaders() },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async approveKeyRegenRequest(
    requestId: string
  ): Promise<{ status: string; message: string; email_notification: EmailNotificationPreview }> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/key-requests/${requestId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyetujui permintaan');
    return data;
  },

  async rejectKeyRegenRequest(
    requestId: string,
    reason: string
  ): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/key-requests/${requestId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menolak permintaan');
    return data;
  },

  async sendTestEmail(toEmail: string): Promise<{ status: string; message: string; result: EmailNotificationPreview }> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/mail/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
      body: JSON.stringify({ recipient: toEmail }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengirim email uji coba');
    return data;
  },

  async getWebhookLogs(): Promise<WebhookLog[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/admin/webhooks/logs`, {
        cache: 'no-store',
        headers: { ...auth.getAuthHeaders() },
      });
      if (!res.ok) throw new Error('Failed to load webhook logs');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getSettings(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/admin/settings`, {
        cache: 'no-store',
        headers: { ...auth.getAuthHeaders() },
      });
      if (!res.ok) throw new Error('Failed to load settings');
      return res.json();
    } catch {
      return {
        master_qris: '00020101021126590013ID.CO.GOPAY.WWW01189360091438291039210215ID10200392019010303UMI51440014ID.CO.QRIS.WWW0215ID10200392019010303UMI5204541153033605802ID5911SendaGo Pay6013Jakarta Pusat61051011062070703A0163046D5E',
        bank_name: 'BCA',
        bank_account_number: '8831092819',
        bank_account_name: 'ADITYA PUTRA',
        is_2fa_enabled: false,
      };
    }
  },

  async updateSettings(payload: { master_qris: string; bank_name: string; bank_account_number: string; bank_account_name: string }): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update settings');
    return data;
  },

  async simulateQRIS(amount: number): Promise<{ qris_string: string; dynamic_qris?: string }> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/qris/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to simulate QRIS');
    return {
      qris_string: data.qris_string || data.dynamic_qris || '',
      dynamic_qris: data.dynamic_qris || data.qris_string || '',
    };
  },

  async getUsers(): Promise<AdminUser[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/admin/users`, {
        cache: 'no-store',
        headers: { ...auth.getAuthHeaders() },
      });
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async createUser(payload: { email: string; name: string; role: string; password?: string }): Promise<AdminUser> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create user');
    return data;
  },

  async updateUser(id: string, payload: { name?: string; role?: string; status?: string }): Promise<AdminUser> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update user');
    return data;
  },

  async resetUser2FA(id: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/users/${id}/reset-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reset 2FA');
    return data;
  },

  async deleteUser(id: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/v1/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete user');
    return data;
  },
};
