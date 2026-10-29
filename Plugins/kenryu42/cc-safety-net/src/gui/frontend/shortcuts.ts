const textEntryTags = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export const isSearchShortcut = (
  event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean },
  target: { tagName: string; isContentEditable: boolean },
) =>
  event.key === '/' &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.altKey &&
  !textEntryTags.has(target.tagName) &&
  !target.isContentEditable;
