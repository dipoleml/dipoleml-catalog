// designlang Chrome extension popup script.
// On open, reads the active tab's URL, shows it, and wires the Extract button
// to hand off to designlang.manavaryasingh.com with the URL prefilled.

const SITE = 'https://designlang.manavaryasingh.com/';

function isExtractable(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function getActiveTabUrl() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.url || '';
}

function render(tabUrl) {
  const display = document.getElementById('url-display');
  const btn = document.getElementById('extract-btn');
  const copy = document.getElementById('copy-cli');

  if (!isExtractable(tabUrl)) {
    display.textContent = '(open a regular https:// page to extract)';
    btn.disabled = true;
    btn.style.opacity = '0.55';
    btn.style.cursor = 'not-allowed';
    copy.setAttribute('aria-disabled', 'true');
    copy.style.pointerEvents = 'none';
    copy.style.opacity = '0.55';
    return;
  }

  display.textContent = tabUrl;

  btn.addEventListener('click', () => {
    const target = `${SITE}?url=${encodeURIComponent(tabUrl)}&source=chrome`;
    chrome.tabs.create({ url: target });
    window.close();
  });

  copy.addEventListener('click', async (e) => {
    e.preventDefault();
    const line = `npx designlang ${tabUrl}`;
    try {
      await navigator.clipboard.writeText(line);
      copy.textContent = 'Copied';
      setTimeout(() => { copy.textContent = 'Copy CLI'; }, 1200);
    } catch {
      copy.textContent = 'Clipboard denied';
    }
  });
}

getActiveTabUrl().then(render);
