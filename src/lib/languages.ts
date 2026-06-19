export const LANGUAGES = [
  { id: 'bafut', label: 'Bafut' },
  { id: 'nufi', label: "Fe'efe'e (Nufi)" },
  { id: 'ghomala', label: "Ghomala'" },
  { id: 'kwa', label: 'Kwa' },
  { id: 'medumba', label: 'Medumba' },
  { id: 'mungaka', label: 'Mungaka' },
  { id: 'ndanda', label: "Nda'nda'" },
  { id: 'ngemba', label: 'Ngemba' },
  { id: 'nguiemboon', label: 'Nguiemboon' },
  { id: 'shupamom', label: 'Shupamom' },
  { id: 'yemba', label: 'Yemba' },
  { id: 'other', label: 'Other language' },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]['id'];

export function getLanguageLabel(languageId: string) {
  return LANGUAGES.find((language) => language.id === languageId)?.label ?? languageId;
}

export function normalizeLanguageId(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function customLanguageLabel(languageId: string) {
  return languageId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(' ');
}
