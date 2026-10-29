// Brutalist — exposed structure, hard edges, raw type, single accent.
// References: David Carson's Ray Gun, early Bloomberg.com, Balenciaga,
// brutalistwebsites.com archive.

export const brutalist = {
  name: 'Brutalist',
  blurb: 'Hard edges, mono type, single screaming accent.',
  fonts: {
    display: { family: 'Space Grotesk', weights: [500, 700], import: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap' },
    body: { family: 'IBM Plex Mono', weights: [400, 500, 700], import: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap' },
  },
  tokens: {
    paper: '#f4f1ea',
    ink: '#0a0a0a',
    inkSoft: '#3a3a3a',
    accent: '#ff4800',
    rule: '#0a0a0a',
    radius: '0px',
    radiusLg: '0px',
    shadow: '6px 6px 0 #0a0a0a',
    shadowSm: '3px 3px 0 #0a0a0a',
    spacingUnit: 8,
    container: '1100px',
    rhythm: 1.45,
  },
  // Signature CSS — applied alongside the per-instance vars below.
  // Use --vocab-* prefix so tokens compose without colliding with the page shape.
  css: `
    :root {
      --vocab-display: 'Space Grotesk', 'Helvetica Neue', sans-serif;
      --vocab-body: 'IBM Plex Mono', ui-monospace, monospace;
    }
    body {
      background: var(--paper);
      color: var(--ink);
      font-family: var(--vocab-body);
      font-size: 15px;
      line-height: 1.55;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .v-display, h1, h2, h3 {
      font-family: var(--vocab-display);
      font-weight: 700;
      letter-spacing: -0.02em;
      text-transform: none;
      line-height: 0.95;
    }
    .v-card { border: 2px solid var(--ink); background: var(--paper); box-shadow: var(--shadow); }
    .v-rule { border-top: 2px solid var(--ink); }
    .v-cta {
      background: var(--accent);
      color: var(--ink);
      border: 2px solid var(--ink);
      box-shadow: var(--shadow-sm);
      padding: 14px 22px;
      font-family: var(--vocab-display);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      transition: transform .08s, box-shadow .08s;
    }
    .v-cta:hover { transform: translate(-2px, -2px); box-shadow: 8px 8px 0 var(--ink); }
    .v-pill { display: inline-block; padding: 4px 10px; border: 1.5px solid var(--ink); background: var(--paper); }
    .v-mark { background: var(--accent); padding: 0 4px; }
    .v-noise {
      background-image: repeating-linear-gradient(45deg, transparent 0 6px, rgba(0,0,0,0.04) 6px 7px);
    }
    a { color: var(--ink); text-decoration: none; border-bottom: 2px solid var(--accent); }
    a:hover { background: var(--accent); }
  `,
};
