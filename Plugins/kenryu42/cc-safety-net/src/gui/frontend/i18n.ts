import { guiData } from './gui-data';
import { en } from './locales/en';
import { ja } from './locales/ja';
import { zhCN } from './locales/zh-CN';
import { resolveLocale } from './preferences';

export const locale = resolveLocale(guiData.preferences.language, navigator.languages);
export const t = { en, ja, 'zh-CN': zhCN }[locale];

export const formatCount = (value: number) => value.toLocaleString(locale);
export const formatDateTime = (ts: string) => new Date(ts).toLocaleString(locale);
export const formatClockTime = (ts: string) =>
  new Date(ts).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });

const relativeTimeFormat = new Intl.RelativeTimeFormat(locale, {
  numeric: 'always',
  style: 'narrow',
});
export const formatRelativeTime = (ts: string) => {
  const minutes = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (!Number.isFinite(minutes)) return '';
  if (minutes >= 1440) return relativeTimeFormat.format(-Math.floor(minutes / 1440), 'day');
  if (minutes >= 60) return relativeTimeFormat.format(-Math.floor(minutes / 60), 'hour');
  if (minutes >= 1) return relativeTimeFormat.format(-minutes, 'minute');
  return t.justNow;
};

export const formatDayHeading = (ts: string) => {
  const date = new Date(ts).toDateString();
  if (date === new Date().toDateString()) return t.today;
  if (date === new Date(Date.now() - 86400000).toDateString()) return t.yesterday;
  return new Date(ts).toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};
