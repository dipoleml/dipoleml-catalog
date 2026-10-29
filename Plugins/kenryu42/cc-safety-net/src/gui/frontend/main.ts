import { locale, t } from './i18n';
import type { Messages } from './locales/en';
import { type Locale, locales } from './preferences';
import { initConfirmDialog, notify, on, qs, savePreference, shared } from './ui';
import {
  initActivity,
  loadActivity,
  limitActivityDays,
  retentionDays,
  showActivity,
} from './views/activity';
import { initIntegrations, loadIntegrations } from './views/integrations';
import { initOverview, loadHealth, loadOverview, loadStarContext } from './views/overview';
import { initPolicy, loadPolicy, showPolicy } from './views/policy';
import { initRules, showRules } from './views/rules';
import { initSettings } from './views/settings';

type TextKey = {
  [Key in keyof Messages]: Messages[Key] extends string ? Key : never;
}[keyof Messages];
const translatedAttributes = ['title', 'aria-label', 'placeholder'];

const translatePage = () => {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    element.textContent = t[element.dataset.i18n as TextKey];
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((element) => {
    element.innerHTML = t[element.dataset.i18nHtml as TextKey];
  });
  translatedAttributes.forEach((attribute) => {
    document.querySelectorAll(`[data-i18n-${attribute}]`).forEach((element) => {
      element.setAttribute(attribute, t[element.getAttribute(`data-i18n-${attribute}`) as TextKey]);
    });
  });
};

const views = {
  overview: [t.navOverview, () => undefined],
  activity: [t.navActivity, showActivity],
  policy: [t.navProtections, showPolicy],
  rules: [t.navCustomRules, showRules],
  integrations: [t.navAgents, () => undefined],
  settings: [t.navSettings, () => undefined],
} satisfies Record<string, [string, (params: URLSearchParams) => void]>;
type ViewName = keyof typeof views;

const applyView = () => {
  const [hashName = '', query = ''] = location.hash.slice(1).split('?');
  const view: ViewName = hashName in views ? (hashName as ViewName) : 'overview';
  document.body.dataset.view = view;
  document.title = `${views[view][0]} · CC Safety Net`;
  document.querySelectorAll<HTMLElement>('[data-view]').forEach((section) => {
    section.hidden = section.dataset.view !== view;
  });
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((link) => {
    link.removeAttribute('aria-current');
    if (link.dataset.nav === view) link.setAttribute('aria-current', 'page');
  });
  window.scrollTo({ top: 0 });
  views[view][1](new URLSearchParams(query));
};

translatePage();
initConfirmDialog();
initOverview();
initActivity();
initPolicy();
initRules();
initIntegrations();
initSettings();
qs('toast-close').addEventListener('click', () => notify(''));
document.querySelectorAll<HTMLSelectElement>('[data-language-select]').forEach((select) => {
  select.value = locale;
  select.addEventListener('change', () => {
    const language = select.value as Locale;
    if (!locales.includes(language) || language === locale) return;
    void savePreference({ language }).then((saved) => {
      if (saved) location.reload();
      select.value = locale;
    });
  });
});
on('dirty', () => {
  qs('nav-dirty').hidden = !shared.dirty;
});
window.addEventListener('hashchange', applyView);
applyView();
void Promise.all([loadIntegrations(), loadHealth()]);
void loadPolicy().then((loaded) => {
  if (location.hash.startsWith('#policy?')) applyView();
  if (loaded) void loadStarContext();
  limitActivityDays(retentionDays());
  void loadOverview();
  void loadActivity();
});
