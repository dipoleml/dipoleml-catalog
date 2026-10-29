'use client';

// §06 Regions + components.
// Two sub-blocks:
//   a. Region classifier — schematic page + legend of 9 roles
//   b. Component clusters — an "unfold" list of 4 button variants

import { useEffect, useRef, useState } from 'react';
import Rule from './Rule';
import Marginalia from './Marginalia';

// Schematic regions — shape matches semantic-regions.js output
// { role, selector, bbox: { x, y, w, h }, signals: [...] }
const REGIONS = [
  { role: 'nav', x: 0, y: 0, w: 640, h: 48 },
  { role: 'hero', x: 0, y: 48, w: 640, h: 140 },
  { role: 'features', x: 0, y: 188, w: 640, h: 84 },
  { role: 'pricing', x: 0, y: 272, w: 640, h: 70 },
  { role: 'testimonials', x: 0, y: 342, w: 640, h: 42 },
  { role: 'footer', x: 0, y: 384, w: 640, h: 36 },
];

const ROLES = [
  { role: 'nav', desc: 'top-anchored navigation', signal: 'landmark + top-anchored + link density > 0.5' },
  { role: 'hero', desc: 'primary above-the-fold statement', signal: 'large type + early viewport + CTA' },
  { role: 'features', desc: 'grid of benefit/feature cells', signal: '3+ siblings, similar structural hash' },
  { role: 'pricing', desc: 'price tiers and plans', signal: 'currency symbol + repeated card shape' },
  { role: 'testimonials', desc: 'social proof / quotes', signal: 'blockquote or quote glyph + attribution' },
  { role: 'cta', desc: 'standalone conversion band', signal: 'single button + heading, full-width container' },
  { role: 'footer', desc: 'bottom landmark', signal: 'landmark + bottom-anchored + link density high' },
  { role: 'sidebar', desc: 'lateral aside content', signal: 'landmark=complementary or aside element' },
  { role: 'content', desc: 'prose / article body', signal: 'main landmark, paragraph density, reading width' },
];

// Cluster — shape matches component-clusters.js output
const BUTTON_CLUSTER = {
  kind: 'button',
  instanceCount: 24,
  variants: [
    {
      name: 'primary',
      css: {
        background: 'var(--accent)',
        color: 'var(--paper)',
        border: '1px solid var(--accent)',
        padding: '10px 18px',
      },
      instanceCount: 14,
    },
    {
      name: 'secondary',
      css: {
        background: 'transparent',
        color: 'var(--ink)',
        border: '1px solid var(--ink)',
        padding: '10px 18px',
      },
      instanceCount: 6,
    },
    {
      name: 'ghost',
      css: {
        background: 'transparent',
        color: 'var(--ink)',
        border: '1px solid transparent',
        padding: '10px 18px',
        textDecoration: 'underline',
        textUnderlineOffset: 3,
      },
      instanceCount: 3,
    },
    {
      name: 'disabled',
      css: {
        background: 'var(--paper-2)',
        color: 'var(--ink-3)',
        border: '1px solid var(--ink-3)',
        padding: '10px 18px',
      },
      instanceCount: 1,
    },
  ],
};

export default function RegionsComponents() {
  return (
    <>
      <Rule number="06" label="Regions and components" />
      <div className="with-margin" style={{ marginTop: 'var(--r5)' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 'var(--r3)' }}>§06 Regions + components</div>
          <h2 className="display" style={{ marginBottom: 'var(--r4)' }}>
            Structure, not just style.
          </h2>
          <p className="prose" style={{ fontSize: 18, maxWidth: '62ch', color: 'var(--ink-2)' }}>
            designlang labels the page before measuring it. Nav, hero, pricing, footer — nine
            roles; landmarks first, heuristics second. Components are clustered by DOM signature
            and style vector, not by guessing at class names.
          </p>

          <RegionOverlay />

          <div
            style={{
              borderTop: '1px solid var(--ink)',
              marginTop: 'var(--r8)',
              paddingTop: 'var(--r6)',
            }}
          />

          <ComponentClusters />
        </div>

        <Marginalia>
          <div>MCP companion</div>
          <p style={{ marginTop: 6 }}>
            Regions and components live alongside the tokens, in the MCP companion JSON and the
            DTCG <code>$extensions</code> field.
          </p>
          <hr style={{ margin: '12px 0', border: 0, borderTop: '1px solid var(--ink-3)' }} />
          <p className="foot">
            Agents can query <code>get_region</code> and <code>get_component</code> over MCP to
            regenerate a section in matching style.
          </p>
        </Marginalia>
      </div>
    </>
  );
}

// ── Sub-block A — Region classifier ────────────────────────────
function RegionOverlay() {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ marginTop: 'var(--r7)' }}>
      <div
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-2)',
          marginBottom: 'var(--r3)',
        }}
      >
        §06.a Region classifier
      </div>

      <div className="grid-12" style={{ alignItems: 'start' }}>
        {/* Schematic page — span 7 */}
        <div style={{ gridColumn: 'span 7' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '640 / 420',
              background: 'var(--paper-2)',
              border: '1px solid var(--ink)',
            }}
          >
            <svg
              viewBox="0 0 640 420"
              preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              role="img"
              aria-label="Schematic page with six classified regions"
            >
              {REGIONS.map((r) => {
                const active = hovered === r.role;
                return (
                  <g
                    key={r.role}
                    onMouseEnter={() => setHovered(r.role)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      x={r.x + 4}
                      y={r.y + 4}
                      width={r.w - 8}
                      height={r.h - 8}
                      fill={active ? 'var(--paper)' : 'transparent'}
                      stroke="var(--ink)"
                      strokeWidth="1"
                    />
                    <rect
                      x={r.x + 10}
                      y={r.y + 10}
                      width={r.role.length * 7 + 10}
                      height={16}
                      fill="var(--paper)"
                      stroke="var(--ink)"
                      strokeWidth="0.5"
                    />
                    <text
                      x={r.x + 15}
                      y={r.y + 21}
                      fontFamily="var(--font-mono)"
                      fontSize="10"
                      fill={active ? 'var(--accent)' : 'var(--ink)'}
                      letterSpacing="0.06em"
                    >
                      {r.role}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div
            className="mono"
            style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 'var(--r3)' }}
          >
            hover a region to match its role in the legend →
          </div>
        </div>

        {/* Legend — span 5 */}
        <div style={{ gridColumn: 'span 5' }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: 'var(--r3)',
              display: 'grid',
              gridTemplateColumns: '100px 1fr',
              gap: 12,
            }}
          >
            <span>role</span>
            <span>signal</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid var(--ink)' }}>
            {ROLES.map((r) => {
              const active = hovered === r.role;
              return (
                <li
                  key={r.role}
                  onMouseEnter={() => setHovered(r.role)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr',
                    gap: 12,
                    padding: '8px 0',
                    borderBottom: '1px solid var(--ink-3)',
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: 12,
                      color: active ? 'var(--ink)' : 'var(--ink-2)',
                      textDecoration: active ? 'underline' : 'none',
                      textDecorationColor: 'var(--accent)',
                      textUnderlineOffset: 3,
                      textDecorationThickness: 2,
                    }}
                  >
                    {r.role}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.45 }}>
                    <span style={{ color: 'var(--ink)' }}>{r.desc}.</span>{' '}
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                      {r.signal}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Sub-block B — Component clusters ───────────────────────────
function ComponentClusters() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div>
      <div
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-2)',
          marginBottom: 'var(--r3)',
        }}
      >
        §06.b Component clusters
      </div>
      <div
        className="mono"
        style={{
          fontSize: 12,
          color: 'var(--ink)',
          marginBottom: 'var(--r4)',
          paddingBottom: 'var(--r3)',
          borderBottom: '1px solid var(--ink)',
        }}
      >
        button — {BUTTON_CLUSTER.instanceCount} instances, {BUTTON_CLUSTER.variants.length}{' '}
        variants ({BUTTON_CLUSTER.variants.map((v) => v.name).join(', ')})
      </div>

      <div
        ref={ref}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--r4)',
        }}
      >
        {BUTTON_CLUSTER.variants.map((v, i) => {
          const shown = reduced || visible;
          return (
            <div
              key={v.name}
              style={{
                border: '1px solid var(--ink)',
                padding: 'var(--r4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--r3)',
                background: 'var(--paper)',
                opacity: shown ? 1 : 0,
                transform: shown ? 'translateX(0)' : 'translateX(-12px)',
                transition: reduced
                  ? 'none'
                  : `opacity 200ms ease ${i * 80}ms, transform 200ms ease ${i * 80}ms`,
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-3)',
                }}
              >
                {v.name} · {v.instanceCount}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 92,
                  background: 'var(--paper-2)',
                  border: '1px solid var(--ink-3)',
                }}
              >
                <span
                  className="mono"
                  style={{
                    ...v.css,
                    fontSize: 13,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    display: 'inline-block',
                  }}
                >
                  Continue
                </span>
              </div>
              <pre
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--ink-2)',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                }}
              >
{formatCss(v.css)}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatCss(css) {
  return Object.entries(css)
    .map(([k, v]) => `${kebab(k)}: ${v};`)
    .join('\n');
}
function kebab(s) {
  return s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}
