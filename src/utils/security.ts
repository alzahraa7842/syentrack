/**
 * Security and Cryptographic Utilities
 * - Secure hashing for passwords using Web Crypto API (SHA-256)
 * - Image file validation (format & size checks)
 */

export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText + '_alumnitrack_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    // Fallback simple hash for older environments without subtle crypto
    let hash = 0;
    for (let i = 0; i < plainText.length; i++) {
      const char = plainText.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `sh_${Math.abs(hash).toString(16)}`;
  }
}

export async function verifyPassword(inputPassword: string, storedPasswordHash?: string): Promise<boolean> {
  if (!inputPassword || !storedPasswordHash) return false;
  
  // 1. Direct match with plain text (for legacy initial seeds like 'Alumni123!', 'Admin123!')
  if (inputPassword === storedPasswordHash) {
    return true;
  }

  // 2. Hash match
  const hashedInput = await hashPassword(inputPassword);
  return hashedInput === storedPasswordHash;
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  dataUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB limit

export function validateAndReadImageFile(file: File): Promise<ImageValidationResult> {
  return new Promise((resolve) => {
    // 1. Type validation
    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      resolve({
        valid: false,
        error: `Format file "${file.type || 'unknown'}" tidak didukung. Harap gunakan format JPG, JPEG, PNG, atau WebP.`
      });
      return;
    }

    // 2. Size validation
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      resolve({
        valid: false,
        error: `Ukuran file terlalu besar (${sizeMb} MB). Batas maksimal ukuran gambar adalah 2 MB.`
      });
      return;
    }

    // 3. Read file as Base64 Data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve({
        valid: true,
        dataUrl: event.target?.result as string,
        fileName: file.name,
        fileSizeBytes: file.size
      });
    };
    reader.onerror = () => {
      resolve({
        valid: false,
        error: 'Gagal membaca berkas gambar. Silakan coba kembali.'
      });
    };
    reader.readAsDataURL(file);
  });
}
