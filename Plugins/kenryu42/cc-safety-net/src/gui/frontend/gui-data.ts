import type { GuiPreferences } from './preferences';

export const guiData = JSON.parse(document.getElementById('ccsn-data')?.textContent ?? '') as {
  token: string;
  preferences: GuiPreferences;
};
