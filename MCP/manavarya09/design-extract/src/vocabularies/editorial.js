// Editorial — broadsheet typography, generous whitespace, ink-on-paper.
// References: NYT Magazine, The Atlantic redesigns, Bloomberg Businessweek.

export const editorial = {
  name: 'Editorial',
  blurb: 'Broadsheet serifs, generous whitespace, ink on paper.',
  fonts: {
    display: { family: 'Instrument Serif', weights: [400], import: 'https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap' },
    body: { family: 'EB Garamond', weights: [400, 500, 700], import: 'https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;700&display=swap' },
  },
  tokens: {
    paper: '#f7f5ef',
    ink: '#141414',
    inkSoft: '#555049',
    accent: '#a52a2a',
    rule: '#d8d3c4',
    radius: '0px',
    radiusLg: '0px',
    shadow: 'none',
    shadowSm: 'none',
    spacingUnit: 8,
    container: '760px',
    rhythm: 1.7,
  },
  css: `
    :root {
      --vocab-display: 'Instrument Serif', 'Times New Roman', serif;
      --vocab-body: 'EB Garamond', 'Garamond', serif;
    }
    body {
      background: var(--paper);
      color: var(--ink);
      font-family: var(--vocab-body);
      font-size: 19px;
      line-height: 1.65;
      letter-spacing: 0.005em;
    }
    .v-display, h1, h2, h3 {
      font-family: var(--vocab-display);
      font-weight: 400;
      letter-spacing: -0.005em;
      line-height: 1.05;
    }
    .v-display em, h1 em, h2 em, h3 em {
      font-style: italic;
      color: var(--accent);
    }
    .v-card { border-top: 1px solid var(--rule); padding-top: 28px; }
    .v-rule { border: 0; height: 1px; background: var(--rule); margin: 32px 0; }
    .v-cta {
      background: transparent;
      color: var(--ink);
      border-bottom: 2px solid var(--accent);
      padding: 4px 0;
      font-family: var(--vocab-display);
      font-style: italic;
      font-size: 22px;
      transition: color .15s;
    }
    .v-cta:hover { color: var(--accent); }
    .v-pill {
      font-family: var(--vocab-body);
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--ink-soft);
    }
    .v-mark {
      font-style: italic;
      color: var(--accent);
    }
    a { color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--rule); padding-bottom: 1px; }
    a:hover { border-bottom-color: var(--accent); color: var(--accent); }
  `,
};
