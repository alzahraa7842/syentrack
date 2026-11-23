export interface SmtpStatus {
  configured: boolean;
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  fromName: string;
  fromEmail: string;
}

export const RealMailService = {
  /**
   * Check if backend SMTP mailer is configured to send real emails to Gmail
   */
  getStatus: async (): Promise<SmtpStatus | null> => {
    try {
      const res = await fetch('/api/smtp/status');
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('Failed to get SMTP status:', e);
      return null;
    }
  },

  /**
   * Save SMTP configuration (e.g. Gmail App Password)
   */
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          enabled: true
        })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Send a REAL email through backend SMTP to any user's real Gmail inbox
   */
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      const data = await res.json();
      return data;
    } catch (e: any) {
      return {
        success: false,
        error: e.message || 'Gagal menghubungi server pengirim email'
      };
    }
  }
};
