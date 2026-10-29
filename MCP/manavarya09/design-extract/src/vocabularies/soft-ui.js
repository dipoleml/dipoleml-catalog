// Soft UI — neumorphism reborn. Cushioned shapes, low contrast, single hue.
// References: Apple Vision OS chrome, modern dashboard work, Spline UI demos.

export const softUi = {
  name: 'Soft UI',
  blurb: 'Cushioned shapes, low contrast, single hue. Vision-OS-adjacent.',
  fonts: {
    display: { family: 'Manrope', weights: [400, 600, 800], import: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;800&display=swap' },
    body: { family: 'Manrope', weights: [400, 500, 600], import: '' },
  },
  tokens: {
    paper: '#eef0f7',
    ink: '#1a1f2e',
    inkSoft: '#6b7280',
    accent: '#6366f1',
    rule: 'rgba(26,31,46,0.08)',
    radius: '14px',
    radiusLg: '24px',
    shadow: '12px 12px 32px rgba(160,170,200,0.45), -12px -12px 32px rgba(255,255,255,0.9)',
    shadowSm: '6px 6px 14px rgba(160,170,200,0.35), -6px -6px 14px rgba(255,255,255,0.85)',
    spacingUnit: 8,
    container: '1100px',
    rhythm: 1.55,
  },
  css: `
    :root {
      --vocab-display: 'Manrope', -apple-system, sans-serif;
      --vocab-body: 'Manrope', -apple-system, sans-serif;
    }
    body {
      background: var(--paper);
      color: var(--ink);
      font-family: var(--vocab-body);
      font-size: 15px;
      line-height: 1.6;
      letter-spacing: -0.005em;
    }
    .v-display, h1, h2, h3 {
      font-family: var(--vocab-display);
      font-weight: 800;
      letter-spacing: -0.025em;
      line-height: 1.05;
    }
    .v-card {
      background: var(--paper);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow);
      padding: 28px;
    }
    .v-rule {
      border: 0;
      height: 4px;
      border-radius: 2px;
      background: var(--paper);
      box-shadow: inset 2px 2px 4px rgba(160,170,200,0.4), inset -2px -2px 4px rgba(255,255,255,0.9);
    }
    .v-cta {
      background: var(--accent);
      color: white;
      border-radius: var(--radius);
      padding: 14px 26px;
      font-family: var(--vocab-display);
      font-weight: 600;
      letter-spacing: -0.005em;
      box-shadow: 6px 6px 14px rgba(99,102,241,0.35), -2px -2px 8px rgba(255,255,255,0.4);
      transition: transform .12s, box-shadow .12s;
    }
    .v-cta:hover { transform: translateY(-1px); box-shadow: 8px 10px 20px rgba(99,102,241,0.45), -3px -3px 8px rgba(255,255,255,0.5); }
    .v-cta:active { transform: translateY(1px); box-shadow: inset 4px 4px 8px rgba(0,0,0,0.15); }
    .v-pill {
      background: var(--paper);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: 600;
      color: var(--ink-soft);
      box-shadow: inset 2px 2px 4px rgba(160,170,200,0.3), inset -2px -2px 4px rgba(255,255,255,0.9);
    }
    .v-mark { color: var(--accent); font-weight: 700; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; text-underline-offset: 4px; }
  `,
};
