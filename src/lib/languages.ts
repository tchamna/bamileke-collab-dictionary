export const LANGUAGES = [
  { id: 'bafut', label: 'Bafut' },
  { id: 'nufi', label: "Fe'efe'e (Nufi)" },
  { id: 'ghomala', label: "Ghomala'" },
  { id: 'kwa', label: 'Kwa' },
  { id: 'medumba', label: 'Medumba' },
  { id: 'mungaka', label: 'Mungaka' },
  { id: 'nguiemboon', label: 'Nguiemboon' },
  { id: 'ndanda', label: "Nda'nda'" },
  { id: 'other', label: 'Other language' },
  { id: 'shupamom', label: 'Shupamom' },
  { id: 'yemba', label: 'Yemba' },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]['id'];

export function getLanguageLabel(languageId: string) {
  return LANGUAGES.find((language) => language.id === languageId)?.label ?? languageId;
}
