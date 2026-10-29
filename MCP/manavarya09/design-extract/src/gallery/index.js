// Gallery — turn a pile of fidelity reports into a shareable, static site.
//
// This is the distribution surface for the fidelity loop: every scored clone
// becomes a card ("97% · A · stripe.com") with a permalink page. The measured
// number is the share hook competitors can't match. Pure data shaping here;
// HTML lives in formatters/gallery.js.

export function slugify(s) {
  return String(s || 'site')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'site';
}

// Normalize a fidelity report (combineFidelity output + meta) into a gallery
// item. Tolerant of partial reports.
export function toGalleryItem(report = {}) {
  return {
    slug: slugify(report.host || report.url),
    host: report.host || (report.url ? safeHost(report.url) : 'site'),
    url: report.url || null,
    cloneUrl: report.cloneUrl || null,
    overall: report.overall ?? null,
    grade: report.grade || 'unknown',
    visual: report.visual ?? null,
    motion: report.motion ?? null,
    generatedAt: report.generatedAt || null,
    directiveCount: Array.isArray(report.directives) ? report.directives.length : 0,
    directives: Array.isArray(report.directives) ? report.directives : [],
    motionAspects: Array.isArray(report.motionAspects) ? report.motionAspects : [],
  };
}

function safeHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

// Build the gallery model: dedupe slugs, sort best-first, compute stats.
export function buildGallery(reports = []) {
  const seen = new Map();
  const items = [];
  for (const r of reports) {
    const item = toGalleryItem(r);
    // Disambiguate colliding slugs (two clones of the same host) deterministically.
    if (seen.has(item.slug)) {
      const n = seen.get(item.slug) + 1;
      seen.set(item.slug, n);
      item.slug = `${item.slug}-${n}`;
    } else {
      seen.set(item.slug, 1);
    }
    items.push(item);
  }

  items.sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));

  const scored = items.filter(i => i.overall != null);
  const stats = {
    count: items.length,
    scored: scored.length,
    avg: scored.length ? Math.round(scored.reduce((s, i) => s + i.overall, 0) / scored.length) : null,
    best: scored.length ? scored[0] : null,
    worst: scored.length ? scored[scored.length - 1] : null,
  };

  return { items, stats };
}
