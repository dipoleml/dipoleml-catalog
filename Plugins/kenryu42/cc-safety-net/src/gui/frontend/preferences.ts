export const locales = ['en', 'ja', 'zh-CN'] as const;
export type Locale = (typeof locales)[number];
const themes = ['light', 'dark'] as const;
type Theme = (typeof themes)[number];
export type GuiPreferences = { language?: Locale; theme?: Theme };
export type PreferenceUpdate = { language?: Locale; theme?: Theme | 'auto' };

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  values.includes(value as T);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseGuiPreferences = (value: unknown): GuiPreferences => {
  const record = isRecord(value) ? value : {};
  return {
    ...(isOneOf(locales, record.language) ? { language: record.language } : {}),
    ...(isOneOf(themes, record.theme) ? { theme: record.theme } : {}),
  };
};

export const parsePreferenceUpdate = (value: unknown): PreferenceUpdate | null => {
  if (!isRecord(value)) return null;
  const fieldsAreKnown = Object.keys(value).every((key) => key === 'language' || key === 'theme');
  const languageIsKnown = value.language === undefined || isOneOf(locales, value.language);
  const themeIsKnown = value.theme === undefined || isOneOf([...themes, 'auto'], value.theme);
  return fieldsAreKnown && languageIsKnown && themeIsKnown ? (value as PreferenceUpdate) : null;
};

export const applyPreferenceUpdate = (
  saved: GuiPreferences,
  update: PreferenceUpdate,
): GuiPreferences => {
  const language = update.language ?? saved.language;
  const theme = update.theme === 'auto' ? undefined : (update.theme ?? saved.theme);
  return { ...(language ? { language } : {}), ...(theme ? { theme } : {}) };
};

const localeByLanguage = new Map<string, Locale>([
  ['en', 'en'],
  ['ja', 'ja'],
  ['zh', 'zh-CN'],
]);

export const resolveLocale = (saved: Locale | undefined, languages: readonly string[]): Locale =>
  saved ??
  languages
    .map((tag) => localeByLanguage.get(tag.toLowerCase().split('-')[0] ?? ''))
    .find((locale) => locale !== undefined) ??
  'en';
