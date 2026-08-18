// Authentication & Token Manager for SendaGo Pay Dashboard

const TOKEN_KEY = 'sendago_auth_token';
const USER_KEY = 'sendago_auth_user';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  is_2fa_enabled?: boolean;
}

export const auth = {
  setSession(token: string, user: AuthUser) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  logout() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/login';
  },

  updateUser(partialUser: Partial<AuthUser>) {
    if (typeof window === 'undefined') return;
    const current = this.getUser() || {
      id: 'default-admin',
      name: 'Aditya Putra',
      email: 'admin@sendago.pay',
    };
    const updated = { ...current, ...partialUser };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('sendago_user_updated', { detail: updated }));
    return updated;
  },

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
};
