/** 실제 호출량은 그대로 두고 README 일러스트와 어울리는 차트를 그립니다. */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { renderPixelText } from './workers-chart-pixel-text.ts';
import { renderChartStickers } from './workers-chart-stickers.ts';
import {
  buildDataLabelIndexes,
  calculateMovingAverage,
  findMinNonZero,
  formatCompactNumber,
  formatNumber,
  isWeekendKst,
  shouldShowWeeklyTick,
  WORKERS_CHART_ACCENT_COLORS,
} from './workers-chart-helpers.ts';

const PIXEL_BACKGROUND = fileURLToPath(
  new URL('../../assets/analytics/workers-chart-pixel-background.png', import.meta.url),
);

const INK = '#583c2c';
const CORAL = '#ce694b';
const SAGE = '#70876a';
const AREA = { left: 144, top: 182, right: 1472, bottom: 514 };

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function linePath(points) {
  return points
    .filter((point) => point.y !== null)
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
}

function pixelPanel(x, y, width, height, fill) {
  const outline = `M${x + 6} ${y} H${x + width - 6} V${y + 6} H${x + width} V${y + height - 6} H${x + width - 6} V${y + height} H${x + 6} V${y + height - 6} H${x} V${y + 6} H${x + 6} Z`;
  return `<g shape-rendering="crispEdges">
    <path d="${outline}" transform="translate(4 4)" fill="#a77a4e" opacity="0.3"/>
    <path d="${outline}" fill="${fill}" stroke="#92623e" stroke-width="2"/>
    <path d="M${x + 8} ${y + 5} H${x + width - 8} M${x + 5} ${y + 8} V${y + height - 8}" fill="none" stroke="#fff8e7" stroke-width="4"/>
    <path d="M${x + 8} ${y + height - 4} H${x + width - 8} M${x + width - 4} ${y + 8} V${y + height - 8}" fill="none" stroke="#d4b17b" stroke-width="3"/>
  </g>`;
}

function pixelPoint(x, y, size, fill) {
  return `<rect x="${(x - size / 2).toFixed(1)}" y="${(y - size / 2).toFixed(1)}" width="${size}" height="${size}" fill="${fill}" stroke="#fff2d4" stroke-width="2"/>`;
}

function metricSvg(x, y, width, label, value, accent) {
  return `<g>
    ${pixelPanel(x, y, width, 82, '#f5e4bc')}
    <rect x="${x + 18}" y="${y + 20}" width="8" height="42" fill="${accent}" />
    <text x="${x + 40}" y="${y + 28}" class="metric-label">${escapeXml(label)}</text>
    <text x="${x + 40}" y="${y + 65}" class="metric-value" fill="${INK}">${escapeXml(value)}</text>
  </g>`;
}

function recentPanel(points) {
  const recent = points.slice(-14);
  const values = recent.map((point) => point.requests);
  const min = Math.min(...values);
  const range = Math.max(Math.max(...values) - min, 1);
  const x = AREA.left;
  const y = 566;
  const width = AREA.right - x;
  const toX = (index) => x + 24 + (index / Math.max(recent.length - 1, 1)) * (width - 48);
  const toY = (value) => y + 84 - ((value - min) / range) * 39;
  const line = linePath(recent.map((point, index) => ({ x: toX(index), y: toY(point.requests) })));
  const latest = recent[recent.length - 1];
  return `<g>
    ${pixelPanel(x, y, width, 100, '#e9e0bd')}
    <text x="${x + 24}" y="${y + 29}" class="panel-title">Last 14 days</text>
    <text x="${x + 218}" y="${y + 29}" class="small">${escapeXml(recent[0].date)} ~ ${escapeXml(latest.date)} · relative scale</text>
    <text x="${AREA.right - 24}" y="${y + 29}" text-anchor="end" class="panel-title">Latest ${escapeXml(formatNumber(latest.requests))}</text>
    <line x1="${x + 24}" y1="${y + 84}" x2="${AREA.right - 24}" y2="${y + 84}" stroke="#dbd4c2" />
    <path d="${line}" fill="none" stroke="${WORKERS_CHART_ACCENT_COLORS.recent14Line}" stroke-width="3" stroke-linejoin="miter" />
    ${recent.map((point, index) => pixelPoint(toX(index), toY(point.requests), index === recent.length - 1 ? 8 : 4, WORKERS_CHART_ACCENT_COLORS.recent14Line)).join('\n')}
  </g>`;
}

export function buildChartSvg(points, summary, metadata) {
  const width = 1600;
  const height = 900;
  const plotWidth = AREA.right - AREA.left;
  const plotHeight = AREA.bottom - AREA.top;
  const values = points.map((point) => point.requests);
  const yMax = Math.ceil(Math.max(...values, 1) / 1000) * 1000;
  const toX = (index) => AREA.left + (index / Math.max(points.length - 1, 1)) * plotWidth;
  const toY = (value) => AREA.bottom - (value / yMax) * plotHeight;
  const chartPoints = points.map((point, index) => ({ x: toX(index), y: toY(point.requests) }));
  const movingAverage = calculateMovingAverage(points, 7).map((value, index) => ({
    x: toX(index),
    y: value === null ? null : toY(value),
  }));
  const min = findMinNonZero(points);
  const peakIndex = values.findIndex((value) => value === Math.max(...values));
  const highlights = new Set([
    points.length - 1,
    peakIndex,
    points.findIndex((point) => point.date === min.date),
  ]);
  const labels = buildDataLabelIndexes(points);
  const labelBoxes = [...labels].map((index) => ({
    left: chartPoints[index].x - formatNumber(points[index].requests).length * 6 - 8,
    top: chartPoints[index].y - 31,
    width: formatNumber(points[index].requests).length * 12 + 16,
    height: 24,
  }));
  const line = linePath(chartPoints);
  const area = `${line} L ${AREA.right} ${AREA.bottom} L ${AREA.left} ${AREA.bottom} Z`;
  const metrics = [
    ['Total requests', formatNumber(summary.total), CORAL],
    ['Average / day', formatNumber(summary.average), '#d6a04b'],
    ['Median / day', formatNumber(summary.median), SAGE],
    ['Recent 7-day average', formatNumber(summary.recent7Average), SAGE],
    [
      'Week-over-week change',
      `${summary.weekOverWeekDiff >= 0 ? '+' : ''}${formatNumber(summary.weekOverWeekDiff)}`,
      '#b69ac2',
    ],
    [
      'Day-over-day change',
      `${summary.dayOverDayDiff >= 0 ? '+' : ''}${formatNumber(summary.dayOverDayDiff)}`,
      '#7fa6b1',
    ],
  ];
  const cardWidth = (plotWidth - 32) / 3;

  return renderPixelText(`<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" role="img" aria-labelledby="chart-title chart-description">
    <title id="chart-title">Cloudflare Requests</title>
    <desc id="chart-description">${escapeXml(`${metadata.startDate} ~ ${metadata.endDate}; ${formatNumber(summary.total)} requests; KST. Requests are not unique users.`)}</desc>
    <defs>
      <pattern id="pixel-fill" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#ce694b" opacity="0.25"/></pattern>
    </defs>
    <text x="${AREA.left}" y="76" class="title">Cloudflare Requests</text>
    <text x="${AREA.left}" y="108" class="subtitle">${escapeXml(`${metadata.startDate} ~ ${metadata.endDate} · ${points.length} days · KST`)}</text>
    <text x="${AREA.right}" y="68" text-anchor="end" class="legend">DAISO MCP</text>
    <text x="${AREA.right}" y="99" text-anchor="end" class="small">${escapeXml(`Updated ${metadata.updatedAtText}`)}</text>
    <line x1="${AREA.left}" y1="145" x2="${AREA.left + 36}" y2="145" stroke="${CORAL}" stroke-width="4" stroke-linecap="square"/>
    <text x="${AREA.left + 48}" y="151" class="legend">Daily requests</text>
    <line x1="${AREA.left + 290}" y1="145" x2="${AREA.left + 330}" y2="145" stroke="${SAGE}" stroke-width="3" stroke-dasharray="8 6"/>
    <text x="${AREA.left + 342}" y="151" class="legend">7-day average</text>
    <rect x="${AREA.right - 148}" y="133" width="16" height="16" rx="0" fill="#eee2cc"/>
    <text x="${AREA.right - 120}" y="147" class="small">Weekend</text>
    <g id="daily-plot" data-min="0" data-max="${yMax}">
    ${pixelPanel(AREA.left - 8, AREA.top - 8, plotWidth + 16, plotHeight + 16, '#f8eaca')}
    ${points
      .map((point, index) => {
        if (!isWeekendKst(point.date)) return '';
        const step = plotWidth / Math.max(points.length - 1, 1);
        const left = Math.max(AREA.left, toX(index) - step / 2);
        const right = Math.min(AREA.right, toX(index) + step / 2);
        return `<rect x="${left.toFixed(1)}" y="${AREA.top}" width="${(right - left).toFixed(1)}" height="${plotHeight}" fill="#eee2cc" opacity="0.38"/>`;
      })
      .join('\n')}
    ${Array.from({ length: 6 }, (_, index) => {
      const tick = Math.round((yMax / 5) * index);
      const y = toY(tick);
      return `<line x1="${AREA.left}" y1="${y.toFixed(1)}" x2="${AREA.right}" y2="${y.toFixed(1)}" stroke="#c8ae83" stroke-dasharray="2 10" stroke-width="2"/><text x="${AREA.left - 18}" y="${(y + 5).toFixed(1)}" text-anchor="end" class="axis">${escapeXml(formatCompactNumber(tick))}</text>`;
    }).join('\n')}
    ${points
      .map((point, index) => {
        if (!shouldShowWeeklyTick(points, index)) return '';
        const x = toX(index);
        return `<line x1="${x.toFixed(1)}" y1="${AREA.bottom}" x2="${x.toFixed(1)}" y2="${AREA.bottom + 7}" stroke="#b9a28c"/><text x="${x.toFixed(1)}" y="${AREA.bottom + 29}" text-anchor="middle" class="axis">${escapeXml(point.date.slice(5))}</text>`;
      })
      .join('\n')}
    <path d="${area}" fill="url(#pixel-fill)"/>
    <path d="${line}" fill="none" stroke="${CORAL}" stroke-width="4" stroke-linecap="square" stroke-linejoin="miter"/>
    <path d="${linePath(movingAverage)}" fill="none" stroke="${WORKERS_CHART_ACCENT_COLORS.movingAverage}" stroke-width="3" stroke-dasharray="8 6"/>
    ${chartPoints.map((point, index) => pixelPoint(point.x, point.y, highlights.has(index) ? 10 : 6, CORAL)).join('\n')}
    ${[...labels]
      .map((index) => {
        const point = chartPoints[index];
        return `<text x="${point.x.toFixed(1)}" y="${(point.y - 17).toFixed(1)}" text-anchor="middle" class="data-label">${escapeXml(formatNumber(points[index].requests))}</text>`;
      })
      .join('\n')}
    ${renderChartStickers(chartPoints, movingAverage, AREA, labelBoxes)}
    </g>
    ${recentPanel(points)}
    ${metrics.map(([label, value, color], index) => metricSvg(AREA.left + (index % 3) * (cardWidth + 16), 682 + Math.floor(index / 3) * 94, cardWidth, label, value, color)).join('\n')}
    <text x="${width / 2}" y="884" text-anchor="middle" class="small">Requests are not unique users · KST daily totals · 7-day trailing average</text>
  </svg>`);
}

export async function renderChart(points, summary, metadata) {
  // 배경의 빈 게시판 안에만 정확한 그래프를 얹고 하단 픽셀 일러스트는 보존합니다.
  const overlay = await sharp(Buffer.from(buildChartSvg(points, summary, metadata)))
    .png()
    .toBuffer();
  return sharp(PIXEL_BACKGROUND)
    .resize(1600, 1200, { kernel: 'nearest', fit: 'fill' })
    .composite([{ input: overlay, left: 0, top: 0 }])
    .png()
    .toBuffer();
}
