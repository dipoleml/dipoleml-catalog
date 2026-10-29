// Shared Playwright browser-launch path.
//
// Preferred: connect to a remote Browserless v2 browser (no Chromium
// binary on the function — cold starts drop from ~3s to ~50ms). Falls
// back to the bundled @sparticuz/chromium on Vercel/Lambda, or a bare
// launch in local dev. Used by lib/pdf.js and /api/motion so the launch
// logic lives in one place.

export async function getLocalBrowserOptions() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import('@sparticuz/chromium')).default;
    return {
      executablePath: await chromium.executablePath(),
      browserArgs: chromium.args,
    };
  }
  return {};
}

export async function getBrowserOptions() {
  if (process.env.BROWSERLESS_TOKEN) {
    const region = process.env.BROWSERLESS_REGION || 'production-sfo';
    return { wsEndpoint: `wss://${region}.browserless.io/?token=${process.env.BROWSERLESS_TOKEN}` };
  }
  return getLocalBrowserOptions();
}

// Open a browser from options; never let a dead remote browser win.
export async function openBrowser(chromium, opts) {
  if (opts.wsEndpoint) return chromium.connect(opts.wsEndpoint);
  if (opts.executablePath) return chromium.launch({ executablePath: opts.executablePath, args: opts.browserArgs || [] });
  return chromium.launch();
}

// A Browserless failure (quota → 401, region down, ws error) should not
// break a request — it just means we fall back to bundled Chromium.
export function isBrowserlessFailure(err) {
  const m = String(err?.message || err || '').toLowerCase();
  return (
    m.includes('browserless') ||
    m.includes('401') ||
    m.includes('unauthorized') ||
    m.includes('usage limit') ||
    m.includes('connectovercdp') ||
    m.includes('websocket')
  );
}
