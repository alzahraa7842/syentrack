import { getAuthToken } from './storageService';

export interface SmtpStatus {
  configured: boolean;
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  fromName: string;
  fromEmail: string;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const RealMailService = {
  getStatus: async (): Promise<SmtpStatus | null> => {
    try {
      const res = await fetch('/api/smtp/status', { headers: authHeaders() });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('Failed to get SMTP status:', e);
      return null;
    }
  },

  saveConfig: async (config: {
    host?: string;
    port?: number;
    user: string;
    pass: string;
    fromName?: string;
    fromEmail?: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await fetch('/api/smtp/config', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          ...config,
          enabled: true,
        }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  sendRealEmail: async (params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    fromName?: string;
  }): Promise<{ success: boolean; messageId?: string; requiresConfig?: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(params),
      });

      const data = await res.json();
      return data;
    } catch (e: any) {
      return {
        success: false,
        error: e.message || 'Gagal menghubungi server pengirim email',
      };
    }
  },
};
