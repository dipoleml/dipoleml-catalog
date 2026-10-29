import { join } from 'node:path';

const frontendDir = join(import.meta.dir, 'frontend');
const readAsset = (name: string) => Bun.file(join(frontendDir, name)).text();
const buildScript = async (entry: string) => {
  const result = await Bun.build({
    entrypoints: [join(frontendDir, entry)],
    target: 'browser',
    minify: false,
    sourcemap: 'none',
  });
  const output = result.outputs[0];
  if (!output)
    throw new Error(
      `GUI page script build failed:\n${result.logs.map((log) => log.message).join('\n')}`,
    );

  return output.text();
};

export const buildGuiDocument = async () => {
  const [pageHtml, faviconSvg, customCss, logoSvg, headScriptJs, pageScriptJs] = await Promise.all([
    readAsset('page.html'),
    readAsset('favicon.svg'),
    readAsset('custom.css'),
    readAsset('logo.svg'),
    buildScript('head.ts'),
    buildScript('main.ts'),
  ]);
  const scripts = new Map([
    ['./head.ts', headScriptJs],
    ['./main.ts', pageScriptJs],
  ]);

  return new HTMLRewriter()
    .on('link[rel="icon"]', {
      element(link) {
        link.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`);
      },
    })
    .on('link[rel="stylesheet"]', {
      element(link) {
        link.replace(`<style>\n${customCss}\n  </style>`, { html: true });
      },
    })
    .on('a.brand-home', {
      element(anchor) {
        anchor.setInnerContent(logoSvg, { html: true });
      },
    })
    .on('script[src]', {
      element(script) {
        script.replace(`<script>\n${scripts.get(script.getAttribute('src') ?? '')}\n  </script>`, {
          html: true,
        });
      },
    })
    .transform(pageHtml);
};

export const guiDocument = await buildGuiDocument();
