export const LANGUAGES = [
  { id: 'nufi', label: 'Nufi' },
  { id: 'ghomala', label: "Ghomala'" },
  { id: 'medumba', label: 'Medumba' },
  { id: 'yemba', label: 'Yemba' },
  { id: 'nguiemboon', label: 'Nguiemboon' },
  { id: 'ndanda', label: "Nda'nda'" },
  { id: 'shupamom', label: 'Shupamom' },
  { id: 'bafut', label: 'Bafut' },
  { id: 'feefe', label: "Fe'efe'e" },
  { id: 'kwa', label: 'Kwa' },
  { id: 'mungaka', label: 'Mungaka' },
  { id: 'other', label: 'Other language' },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]['id'];

export function getLanguageLabel(languageId: string) {
  return LANGUAGES.find((language) => language.id === languageId)?.label ?? languageId;
}

