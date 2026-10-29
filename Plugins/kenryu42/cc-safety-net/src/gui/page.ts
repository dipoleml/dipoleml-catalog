import { guiDocument } from './assets';
import type { GuiPreferences } from './frontend/preferences';

const dataTag = '<script id="ccsn-data" type="application/json">';

export function renderPolicyGuiHtml(
  data: { token: string; preferences: GuiPreferences },
  document = guiDocument,
): string {
  return document.replace(dataTag, () => dataTag + JSON.stringify(data).replaceAll('<', '\\u003c'));
}
