# designlang — Chrome extension

Right-click → Extract design on any page. The extension opens
[designlang.manavaryasingh.com](https://designlang.manavaryasingh.com) with the
current tab's URL prefilled, so extraction starts with one click instead of
switching windows and pasting.

## Features

- One-click handoff from any `http(s)://` page to the hosted extractor
- "Copy CLI" button — drops `npx designlang <url>` straight into your clipboard
- Zero tracking, zero analytics, zero permissions beyond `activeTab`

## Install (developer mode, pending Chrome Web Store publish)

1. Clone this repo.
2. Open `chrome://extensions` in Chromium / Chrome / Edge / Arc / Brave.
3. Toggle **Developer mode** (top right).
4. Click **Load unpacked** and pick the `chrome-extension/` folder in this repo.
5. Pin the extension from the puzzle-piece menu.

## Permissions

- `activeTab` — to read the URL of the tab you triggered the popup on.
- `host_permissions` scoped to `https://designlang.manavaryasingh.com/*` for the
  handoff.

No content scripts, no remote code, no background service worker. The whole
extension is ~3 KB of static HTML/JS/CSS.

## Roadmap

- Chrome Web Store listing.
- Optional right-click context menu on links: *"Extract design from this link"*.
- DevTools panel that shows the extracted tokens for the current tab alongside
  the real DOM selector that produced them.
- Firefox + Edge listings (the same MV3 manifest works for both).

## Contributing

PRs welcome. See the root [`CONTRIBUTING.md`](../CONTRIBUTING.md).
