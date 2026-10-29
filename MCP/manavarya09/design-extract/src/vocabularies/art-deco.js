// Art Deco — geometry, gold, ornament, vertical typography.
// References: Chrysler Building, 1920s Vogue covers, Gatsby-era posters.

export const artDeco = {
  name: 'Art Deco',
  blurb: 'Gold on ink, geometric ornament, vertical type.',
  fonts: {
    display: { family: 'Playfair Display', weights: [400, 700, 900], import: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap' },
    body: { family: 'Cormorant Garamond', weights: [400, 500, 700], import: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;700&display=swap' },
  },
  tokens: {
    paper: '#0d1117',
    ink: '#e8d4a0',
    inkSoft: '#a89968',
    accent: '#d4af37',
    rule: '#a89968',
    radius: '0px',
    radiusLg: '2px',
    shadow: 'none',
    shadowSm: 'none',
    spacingUnit: 8,
    container: '1080px',
    rhythm: 1.55,
  },
  css: `
    :root {
      --vocab-display: 'Playfair Display', 'Times New Roman', serif;
      --vocab-body: 'Cormorant Garamond', 'Garamond', serif;
    }
    body {
      background: var(--paper);
      color: var(--ink);
      font-family: var(--vocab-body);
      font-size: 18px;
      line-height: 1.6;
      background-image:
        linear-gradient(135deg, rgba(212,175,55,0.04) 0%, transparent 40%),
        radial-gradient(ellipse at top, rgba(232,212,160,0.06) 0%, transparent 70%);
    }
    .v-display, h1, h2, h3 {
      font-family: var(--vocab-display);
      font-weight: 900;
      letter-spacing: 0.005em;
      line-height: 1.0;
      color: var(--accent);
    }
    .v-card { border: 1px solid var(--rule); padding: 28px; position: relative; }
    .v-card::before, .v-card::after {
      content: '';
      position: absolute; width: 12px; height: 12px;
      border: 1px solid var(--accent);
    }
    .v-card::before { top: -1px; left: -1px; border-right: 0; border-bottom: 0; }
    .v-card::after { bottom: -1px; right: -1px; border-left: 0; border-top: 0; }
    .v-rule {
      border: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--accent) 20%, var(--accent) 80%, transparent);
      margin: 32px auto;
      max-width: 200px;
    }
    .v-cta {
      background: var(--paper);
      color: var(--accent);
      border: 1.5px solid var(--accent);
      padding: 14px 32px;
      font-family: var(--vocab-display);
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-size: 12px;
      transition: background .2s;
    }
    .v-cta:hover { background: var(--accent); color: var(--paper); }
    .v-pill { font-family: var(--vocab-body); font-style: italic; color: var(--accent); letter-spacing: 0.04em; }
    .v-mark { color: var(--accent); font-style: italic; }
    a { color: var(--accent); text-decoration: none; border-bottom: 1px solid currentColor; padding-bottom: 1px; }
  `,
};
