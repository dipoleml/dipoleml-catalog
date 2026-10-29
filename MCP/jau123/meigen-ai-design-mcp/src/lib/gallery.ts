/** Presentation only: choose one matched still image, keeping reference ordering intact. */
export function galleryPreviewUrl(row: Record<string, unknown>): string | undefined {
  const media = Array.isArray(row.media_urls) ? row.media_urls : [];
  const index = row.matched_media_index;
  const matched = typeof index === 'number' && Number.isInteger(index) && index >= 0 ? media[index] : undefined;
  for (const value of [matched, row.thumbnail_url, ...media]) {
    if (typeof value !== 'string') continue;
    try {
      const url = new URL(value);
      if (url.origin === 'https://images.meigen.ai' && !url.username && !url.password && /\.(png|jpe?g|webp|avif|gif)$/i.test(url.pathname)) return url.href;
    } catch { /* Malformed public metadata cannot become a preview. */ }
  }
}


/** Keep untrusted source data on one visual line without changing its JSON value. */
export function galleryJson(value: unknown): string {
  return (JSON.stringify(value) ?? 'null').replace(/[\u0085\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/g,
    character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

export function galleryResources(id: string, urls: string[]) {
  return [...new Set(urls)].flatMap((uri, index) => {
    try {
      const url = new URL(uri);
      if (url.origin !== 'https://images.meigen.ai' || url.username || url.password) return [];
      return [{ type: 'resource_link' as const, uri: url.href, name: `Gallery media ${index + 1} (${id})` }];
    } catch { return []; }
  });
}
