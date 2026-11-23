import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send'
];

const provider = new GoogleAuthProvider();
GMAIL_SCOPES.forEach(scope => provider.addScope(scope));

// In-memory cache for OAuth access token
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initGoogleAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

/**
 * Trigger popup to sign in with Google and request Gmail send permissions
 */
export const connectGoogleWorkspace = async (): Promise<{ user: FirebaseUser; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal memperoleh access token Google Workspace');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Workspace Auth error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const disconnectGoogleWorkspace = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error(e);
  }
  cachedAccessToken = null;
};

/**
 * Encode string to Base64URL (RFC 4648)
 */
function base64UrlEncode(str: string): string {
  // Use UTF-8 safe encoding
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send a REAL email through Google's official Gmail API
 */
export const sendRealGmailEmail = async (params: {
  to: string;
  subject: string;
  htmlBody: string;
  fromName?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const token = getGoogleAccessToken();
  if (!token) {
    return { 
      success: false, 
      error: 'Google Workspace belum diotorisasi. Silakan klik "Hubungkan Akun Gmail Resmi" terlebih dahulu.' 
    };
  }

  try {
    const rawRfc2822 = [
      `To: ${params.to}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      params.htmlBody
    ].join('\r\n');

    const raw = base64UrlEncode(rawRfc2822);

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Gmail API Error Response:', errData);
      return { 
        success: false, 
        error: errData?.error?.message || `Gagal mengirim email via Gmail API (HTTP ${response.status})` 
      };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (err: any) {
    console.error('Error invoking Gmail API:', err);
    return { success: false, error: err?.message || 'Terjadi kesalahan jaringan saat mengirim email' };
  }
};
