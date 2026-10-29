import { guiData } from './gui-data';
import { resolveLocale } from './preferences';

document.documentElement.lang = resolveLocale(guiData.preferences.language, navigator.languages);
if (guiData.preferences.theme)
  document.documentElement.style.colorScheme = guiData.preferences.theme;
