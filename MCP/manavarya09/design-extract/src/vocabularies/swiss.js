// Swiss — international typographic style, restraint, grids, helvetica.
// References: Müller-Brockmann, Vignelli, post-Bauhaus corporate identity.

export const swiss = {
  name: 'Swiss',
  blurb: 'Helvetica, grids, restraint. The post-Bauhaus default.',
  fonts: {
    display: { family: 'Inter', weights: [400, 700, 900], import: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap' },
    body: { family: 'Inter', weights: [400, 500], import: '' },
  },
  tokens: {
    paper: '#ffffff',
    ink: '#111111',
    inkSoft: '#5b5b5b',
    accent: '#d62828',
    rule: '#111111',
    radius: '0px',
    radiusLg: '0px',
    shadow: 'none',
    shadowSm: 'none',
    spacingUnit: 8,
    container: '1180px',
    rhythm: 1.5,
  },
  css: `
    :root {
      --vocab-display: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      --vocab-body: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }
    body {
      background: var(--paper);
      color: var(--ink);
      font-family: var(--vocab-body);
      font-size: 15px;
      line-height: 1.5;
      letter-spacing: -0.005em;
    }
    .v-display, h1, h2, h3 {
      font-family: var(--vocab-display);
      font-weight: 900;
      letter-spacing: -0.025em;
      line-height: 1.0;
    }
    .v-card { border-top: 1px solid var(--ink); padding-top: 24px; }
    .v-rule { border-top: 1px solid var(--ink); }
    .v-cta {
      background: var(--ink);
      color: var(--paper);
      padding: 14px 22px;
      font-family: var(--vocab-display);
      font-weight: 700;
      letter-spacing: -0.005em;
    }
    .v-cta:hover { background: var(--accent); }
    .v-pill { font-family: var(--vocab-body); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-soft); }
    .v-mark { color: var(--accent); }
    a { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }
    a:hover { color: var(--accent); }
  `,
};
