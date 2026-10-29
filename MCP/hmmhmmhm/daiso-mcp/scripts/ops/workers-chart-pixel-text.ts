/** 번들 픽셀 글꼴을 SVG 경로로 그려 OS별 폰트 대체와 흐려짐을 피합니다. */
import { readFileSync } from 'node:fs';

const font = JSON.parse(
  readFileSync(new URL('../../assets/fonts/silkscreen-glyphs.json', import.meta.url), 'utf8'),
);
const MUTED = '#73563e';

function decodeXml(text) {
  return text
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&');
}

export function renderPixelText(svg) {
  return svg.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/g, (_match, attrs, label) => {
    const cls = attrs.match(/class="([^"]+)"/)?.[1];
    const size = cls === 'title' || cls === 'metric-value' ? 32 : 16;
    const scale = size / font.unitsPerEm;
    const glyphs = [...decodeXml(label)].map((char) => font.glyphs[char] ?? font.glyphs['?']);
    const width = glyphs.reduce((total, glyph) => total + glyph.advance * scale, 0);
    const anchor = attrs.match(/text-anchor="([^"]+)"/)?.[1];
    const x = Number(attrs.match(/\bx="([^"]+)"/)[1]);
    const y = Number(attrs.match(/\by="([^"]+)"/)[1]);
    const left = Math.round(x - (anchor === 'end' ? width : anchor === 'middle' ? width / 2 : 0));
    const fill =
      attrs.match(/\bfill="([^"]+)"/)?.[1] ??
      (['subtitle', 'small', 'axis', 'metric-label'].includes(cls) ? MUTED : '#583c2c');
    let advance = 0;
    const paths = glyphs
      .map((glyph) => {
        const path = `<path d="${glyph.path}" transform="translate(${left + advance} ${Math.round(y)}) scale(${scale} ${-scale})"/>`;
        advance += glyph.advance * scale;
        return path;
      })
      .join('');
    const badge =
      cls === 'data-label'
        ? `<rect x="${left - 6}" y="${Math.round(y) - 14}" width="${width + 12}" height="20" fill="#fff2d4" stroke="#a37348" stroke-width="2"/>`
        : '';
    return `<g data-pixel-font="Silkscreen" aria-label="${label}" fill="${fill}" shape-rendering="crispEdges">${badge}${paths}</g>`;
  });
}
