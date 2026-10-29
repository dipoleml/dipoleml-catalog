'use client';

import { useState } from 'react';

export default function CopyCmd({ cmd = 'npx designlang stripe.com', hint = '— no install, no account' }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = cmd;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* noop */ }
      document.body.removeChild(ta);
    }
  }

  return (
    <button type="button" className="copycmd" onClick={copy} aria-label={`Copy command: ${cmd}`}>
      <span className="copycmd-prompt mono">$</span>
      <span className="copycmd-cmd mono">{cmd}</span>
      <span className="copycmd-glyph mono" aria-hidden>{copied ? 'copied' : 'copy'}</span>
      {hint ? <span className="copycmd-hint mono">{hint}</span> : null}
    </button>
  );
}
