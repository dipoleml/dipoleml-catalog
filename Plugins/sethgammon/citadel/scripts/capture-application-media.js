#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const OUTPUT = path.join(DOCS, 'assets', 'application');
const VIEWPORT = Object.freeze({ width: 1440, height: 900 });
const CAPTURES = Object.freeze([
  { path: '/', output: '01-product-entry.png' },
  { path: '/evidence.html', output: '02-evidence-hero.png' },
  { path: '/evidence.html?capture=comparisons', output: '03-policy-comparison.png', anchor: '.comparison-card:nth-of-type(5)' },
]);

const MIME = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.vtt': 'text/vtt; charset=utf-8',
  '.webm': 'video/webm',
});

function resolveRequest(url) {
  const requested = decodeURIComponent(new URL(url, 'http://127.0.0.1').pathname);
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
  const target = path.resolve(DOCS, relative);
  assert(target === DOCS || target.startsWith(`${DOCS}${path.sep}`), `request escaped docs: ${requested}`);
  return target;
}

function createStaticServer() {
  return http.createServer((request, response) => {
    try {
      const target = resolveRequest(request.url || '/');
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
      });
      fs.createReadStream(target).pipe(response);
    } catch (error) {
      response.writeHead(400).end(error.message);
    }
  });
}

async function capture(page, baseUrl, spec) {
  const consoleErrors = [];
  const onConsole = (message) => {
    if (message.type() !== 'error') return;
    const source = message.location().url || '';
    if (!source || source.startsWith(baseUrl)) consoleErrors.push(message.text());
  };
  const onPageError = (error) => consoleErrors.push(error.message);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  const response = await page.goto(`${baseUrl}${spec.path}`, { waitUntil: 'networkidle' });
  assert(response && response.ok(), `${spec.path} returned ${response ? response.status() : 'no response'}`);
  await page.evaluate(() => document.fonts.ready);
  if (spec.anchor) {
    const top = await page.locator(spec.anchor).evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((offset) => window.scrollTo(0, Math.max(0, offset - 72)), top);
  }
  await page.waitForTimeout(250);

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert(layout.scrollWidth <= layout.clientWidth + 1, `${spec.path} has horizontal overflow ${layout.scrollWidth}/${layout.clientWidth}`);
  assert.deepStrictEqual(consoleErrors, [], `${spec.path} console errors: ${consoleErrors.join(' | ')}`);

  const target = path.join(OUTPUT, spec.output);
  await page.screenshot({ path: target, fullPage: false });
  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  return { path: spec.path, output: path.relative(ROOT, target), scroll_y: await page.evaluate(() => window.scrollY) };
}

async function main() {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const results = [];
  try {
    for (const spec of CAPTURES) results.push(await capture(page, baseUrl, spec));
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  process.stdout.write(`${JSON.stringify({ schema: 1, viewport: VIEWPORT, captures: results }, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`application media capture failed: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = Object.freeze({ CAPTURES, VIEWPORT, createStaticServer, resolveRequest });
