'use client';

import { useRef, useState } from 'react';

const TABS = [
  {
    id: 'web',
    label: 'Web',
    filename: 'tokens.css',
    code: `:root {
  --color-action-primary: #533afd;
  --radius-control: 8px;
}`,
  },
  {
    id: 'ios',
    label: 'iOS',
    filename: 'DesignTokens.swift',
    code: `import SwiftUI

extension Color {
  static let actionPrimary = Color(hex: 0x533AFD)
}`,
  },
  {
    id: 'android',
    label: 'Android',
    filename: 'DesignTokens.kt',
    code: `import androidx.compose.ui.graphics.Color

val ActionPrimary = Color(0xFF533AFD)

// res/values/colors.xml
// <color name="action_primary">#FF533AFD</color>`,
  },
  {
    id: 'flutter',
    label: 'Flutter',
    filename: 'design_tokens.dart',
    code: `import 'package:flutter/material.dart';

class DesignTokens {
  static const Color actionPrimary = Color(0xFF533AFD);
}`,
  },
  {
    id: 'wordpress',
    label: 'WordPress',
    filename: 'theme.json',
    code: `{
  "settings": {
    "color": {
      "palette": [
        { "slug": "action-primary", "color": "#533AFD", "name": "Action Primary" }
      ]
    }
  }
}`,
  },
];

export default function PlatformTabs() {
  const [activeId, setActiveId] = useState(TABS[0].id);
  const [copied, setCopied] = useState(false);
  const tabRefs = useRef({});

  const active = TABS.find((t) => t.id === activeId) || TABS[0];
  const lines = active.code.split('\n');

  const onKeyDown = (e) => {
    const idx = TABS.findIndex((t) => t.id === activeId);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = TABS[(idx + 1) % TABS.length];
      setActiveId(next.id);
      tabRefs.current[next.id]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = TABS[(idx - 1 + TABS.length) % TABS.length];
      setActiveId(next.id);
      tabRefs.current[next.id]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveId(TABS[0].id);
      tabRefs.current[TABS[0].id]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = TABS[TABS.length - 1];
      setActiveId(last.id);
      tabRefs.current[last.id]?.focus();
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(active.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // noop
    }
  };

  return (
    <div>
      <div style={{ padding: 'var(--r5) 0 var(--r4)' }}>
        <div className="eyebrow" style={{ marginBottom: 'var(--r3)' }}>§03 Multi-platform emitters</div>
        <h2 className="display">One token. Five languages.</h2>
        <p className="prose" style={{ marginTop: 'var(--r4)', fontSize: 18, maxWidth: '52ch' }}>
          The same semantic token, emitted in five native dialects. No style leaks,
          no translation layer.
        </p>
      </div>

      {/* Tab strip */}
      <div
        role="tablist"
        aria-label="Platform emitters"
        onKeyDown={onKeyDown}
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: 'var(--hair)',
        }}
      >
        {TABS.map((t) => {
          const selected = t.id === activeId;
          return (
            <button
              key={t.id}
              ref={(el) => (tabRefs.current[t.id] = el)}
              role="tab"
              id={`platform-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`platform-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(t.id)}
              style={{
                padding: '14px 18px 13px',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: selected ? 'var(--ink)' : 'var(--ink-2)',
                borderBottom: selected ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px',
                background: 'transparent',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Code panel */}
      <div
        role="tabpanel"
        id={`platform-panel-${active.id}`}
        aria-labelledby={`platform-tab-${active.id}`}
        style={{
          position: 'relative',
          background: 'var(--ink)',
          color: 'var(--paper)',
          border: 'var(--hair)',
          borderTop: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            padding: '12px 20px',
            borderBottom: '1px solid var(--ink-2)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
          }}
        >
          <span>{active.filename}</span>
          <button
            onClick={onCopy}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: copied ? 'var(--accent)' : 'var(--paper)',
              padding: '4px 10px',
              border: '1px solid var(--ink-3)',
            }}
            aria-live="polite"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div
          style={{
            padding: '20px 0',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            lineHeight: 1.6,
            fontFeatureSettings: "'zero' 1, 'ss01' 1",
          }}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '3.5rem 1fr',
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  color: 'var(--ink-3)',
                  textAlign: 'right',
                  paddingRight: 14,
                  borderRight: '1px solid var(--ink-2)',
                  userSelect: 'none',
                }}
              >
                {i + 1}
              </span>
              <pre style={{ margin: 0, paddingLeft: 20, whiteSpace: 'pre', color: 'var(--paper)' }}>
                {line || ' '}
              </pre>
            </div>
          ))}
        </div>
      </div>

      <p
        className="mono"
        style={{
          marginTop: 'var(--r4)',
          fontSize: 12,
          color: 'var(--ink-2)',
        }}
      >
        <code>designlang &lt;url&gt; --platforms all</code> writes these files under{' '}
        <code>./design-extract-output/&lt;platform&gt;/</code>.
      </p>
    </div>
  );
}
