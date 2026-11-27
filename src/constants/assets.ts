export const DEFAULT_HERO_IMAGE = '/images/hero_alumni_careers_1790318409918.jpg';
export const DEFAULT_SCHOOL_LOGO = '/images/school_crest_logo_1790318420474.jpg';
export const DEFAULT_AVATAR_COWO = '/images/avatar_cowo.svg';
export const DEFAULT_AVATAR_CEWE = '/images/avatar_cewe.svg';

const LEGACY_ASSET_MAP: Record<string, string> = {
  '/src/assets/images/hero_alumni_careers_1790318409918.jpg': DEFAULT_HERO_IMAGE,
  '/src/assets/images/school_crest_logo_1790318420474.jpg': DEFAULT_SCHOOL_LOGO,
  '/src/assets/images/avatar_cowo.svg': DEFAULT_AVATAR_COWO,
  '/src/assets/images/avatar_cewe.svg': DEFAULT_AVATAR_CEWE,
};

/**
 * Normalizes legacy `/src/assets/images/...` paths (which fail in `vite build` / Vercel)
 * to static `/images/...` paths served from `/public/images`.
 */
export function resolveAssetUrl(url: string | undefined | null, fallback = ''): string {
  if (typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  if (LEGACY_ASSET_MAP[trimmed]) {
    return LEGACY_ASSET_MAP[trimmed];
  }
  if (trimmed.startsWith('/src/assets/images/')) {
    return `/images/${trimmed.slice('/src/assets/images/'.length)}`;
  }
  return trimmed;
}
