import { DEFAULT_AVATAR_COWO, DEFAULT_AVATAR_CEWE } from './assets';

export const AVATAR_COWO = DEFAULT_AVATAR_COWO;
export const AVATAR_CEWE = DEFAULT_AVATAR_CEWE;

export const AVATAR_OPTIONS = [
  {
    id: 'cowo',
    label: 'Karakter Cowo (Laki-laki)',
    shortLabel: 'Cowo',
    url: AVATAR_COWO,
  },
  {
    id: 'cewe',
    label: 'Karakter Cewe (Perempuan)',
    shortLabel: 'Cewe',
    url: AVATAR_CEWE,
  },
] as const;
