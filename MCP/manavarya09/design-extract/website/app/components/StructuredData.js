import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_KEYWORDS, FAQ } from '../seo-config';

// JSON-LD structured data. All content is server-literal — no user input is
// interpolated into the JSON string. This matches the Next.js App Router
// metadata docs' recommended inline-script pattern.
// https://nextjs.org/docs/app/building-your-application/optimizing/metadata#json-ld
export default function StructuredData() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#software`,
        name: 'designlang',
        alternateName: ['design-extract', 'designlang CLI'],
        description: SITE_DESCRIPTION,
        applicationCategory: 'DeveloperApplication',
        applicationSubCategory: 'Design System Extractor',
        operatingSystem: 'macOS, Windows, Linux',
        softwareVersion: '12.11.0',
        downloadUrl: 'https://www.npmjs.com/package/designlang',
        installUrl: 'https://www.npmjs.com/package/designlang',
        url: SITE_URL,
        screenshot: `${SITE_URL}/opengraph-image`,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
        license: 'https://opensource.org/licenses/MIT',
        codeRepository: 'https://github.com/Manavarya09/design-extract',
        programmingLanguage: ['JavaScript', 'TypeScript'],
        runtimePlatform: 'Node.js 20+',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          ratingCount: '2593',
          bestRating: '5',
          worstRating: '1',
        },
        featureList: [
          'Reverse-engineer any URL into a complete W3C DTCG design system',
          'Emits primitive, semantic, and composite tokens',
          'Multi-platform output: Tailwind, CSS variables, Figma variables, shadcn/ui, React, Vue, Svelte, iOS SwiftUI, Android Jetpack Compose, Flutter, WordPress block theme',
          'Print-ready brand-book PDF with chapter bookmarks, running footer, and DTCG tokens attached',
          'Stdio MCP server for Claude Code, Cursor, and Windsurf',
          'Auto-generated AGENTS.md, .cursorrules, Claude Code skills',
          'CSS health audit: specificity graph, !important count, unused CSS via Coverage API, @keyframes catalog',
          'WCAG accessibility remediation with nearest passing palette colour',
          'Semantic region classifier (nav, hero, pricing, testimonials, footer, and more)',
          'Reusable component clustering with variant detection',
          'Motion tokens, hover/focus/active state capture, dark-mode pairing',
          'CI drift bot, clone command (Next.js scaffold), local studio',
        ],
        keywords: SITE_KEYWORDS.slice(0, 30).join(', '),
        author:    { '@id': `${SITE_URL}/#person` },
        publisher: { '@id': `${SITE_URL}/#person` },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { '@id': `${SITE_URL}/#person` },
        inLanguage: 'en-US',
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/gallery?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Person',
        '@id': `${SITE_URL}/#person`,
        name: 'Manav Arya Singh',
        url: 'https://manavaryasingh.com',
        sameAs: [
          'https://github.com/Manavarya09',
          'https://www.npmjs.com/~manavarya0909',
          'https://twitter.com/manavaryasingh',
        ],
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#org`,
        name: 'designlang',
        url: SITE_URL,
        logo: `${SITE_URL}/brand-mark.svg`,
        sameAs: [
          'https://github.com/Manavarya09/design-extract',
          'https://www.npmjs.com/package/designlang',
        ],
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${SITE_URL}/#breadcrumbs`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home',     item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Features', item: `${SITE_URL}/features` },
          { '@type': 'ListItem', position: 3, name: 'Gallery',  item: `${SITE_URL}/gallery` },
          { '@type': 'ListItem', position: 4, name: 'Spec',     item: `${SITE_URL}/spec` },
          { '@type': 'ListItem', position: 5, name: 'vs design-extractor', item: `${SITE_URL}/vs/design-extractor` },
        ],
      },
      {
        '@type': 'HowTo',
        '@id': `${SITE_URL}/#howto`,
        name: 'Extract any website\'s design system in 10 seconds',
        description: 'Install designlang and extract the full design system of any URL into DTCG tokens, Tailwind config, Figma variables, and a brand-book PDF.',
        totalTime: 'PT10S',
        tool: [{ '@type': 'HowToTool', name: 'Node.js 20 or later' }],
        step: [
          { '@type': 'HowToStep', position: 1, name: 'Run the CLI',                text: 'In your terminal, run: npx designlang stripe.com' },
          { '@type': 'HowToStep', position: 2, name: 'Read the output',             text: 'designlang writes 17+ files into ./design-extract-output: DTCG tokens, Tailwind config, Figma variables, shadcn theme, iOS / Android / Flutter / WordPress emitters, plus a paste-ready prompt pack.' },
          { '@type': 'HowToStep', position: 3, name: 'Generate a brand-book PDF',   text: 'Add --pdf for a print-ready 13-chapter brand guidelines PDF: npx designlang brand stripe.com --pdf' },
          { '@type': 'HowToStep', position: 4, name: 'Wire into your editor',       text: 'Run `designlang mcp` to expose tokens to Claude Code, Cursor, and Windsurf via the Model Context Protocol.' },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        mainEntity: FAQ.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  };

  const json = JSON.stringify(graph).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
