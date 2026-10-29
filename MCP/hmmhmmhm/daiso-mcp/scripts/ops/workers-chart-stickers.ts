/** 실제 데이터 위의 빈 공간에만 작은 장식을 배치합니다. */
import { readFileSync } from 'node:fs';

const images = ['hamster', 'bag', 'gray-hamster'].map((name) =>
  readFileSync(
    new URL(`../../assets/analytics/chart-stickers/${name}.png`, import.meta.url),
  ).toString('base64'),
);

function minYInRange(series, left, right) {
  let min = Infinity;
  for (let i = 0; i < series.length; i++) {
    const point = series[i];
    if (point.y === null) continue;
    if (point.x >= left && point.x <= right) min = Math.min(min, point.y);
    const previous = series[i - 1];
    if (!previous || previous.y === null || point.x <= previous.x) continue;
    const from = Math.max(left, previous.x);
    const to = Math.min(right, point.x);
    if (from > to) continue;
    const at = (x) =>
      previous.y + ((x - previous.x) / (point.x - previous.x)) * (point.y - previous.y);
    min = Math.min(min, at(from), at(to));
  }
  return min;
}

function overlaps(a, b, margin) {
  return (
    a.left < b.left + b.width + margin &&
    a.left + a.width + margin > b.left &&
    a.top < b.top + b.height + margin &&
    a.top + a.height + margin > b.top
  );
}

export function placeChartStickers(daily, average, area, labels) {
  if (daily.length === 0) return [];
  const slots = [];
  const candidates = [
    [0.14, 0.22],
    [0.38, 0.55],
    [0.61, 0.18],
    [0.8, 0.42],
    [0.5, 0.2],
    [0.24, 0.42],
    [0.68, 0.43],
  ];
  for (const [x, y] of candidates) {
    const box = {
      left: Math.round(area.left + x * (area.right - area.left) - 32),
      top: Math.round(area.top + y * (area.bottom - area.top) - 32),
      width: 64,
      height: 64,
    };
    if (
      box.left < area.left + 24 ||
      box.left + 64 > area.right - 24 ||
      box.top < area.top + 24 ||
      box.top + 64 > area.bottom - 24
    )
      continue;
    const highestLine = Math.min(
      minYInRange(daily, box.left - 24, box.left + 88),
      minYInRange(average, box.left - 24, box.left + 88),
    );
    if (box.top + 64 + 24 >= highestLine) continue;
    if (labels.some((label) => overlaps(box, label, 16))) continue;
    if (slots.some((slot) => overlaps(box, slot, 32))) continue;
    slots.push(box);
    if (slots.length === 3) break;
  }
  return slots;
}

export function renderChartStickers(daily, average, area, labels) {
  return placeChartStickers(daily, average, area, labels)
    .map(
      (slot, index) =>
        `<image data-chart-sticker="${index}" aria-hidden="true" x="${slot.left}" y="${slot.top}" width="64" height="64" href="data:image/png;base64,${images[index]}" image-rendering="pixelated"/>`,
    )
    .join('\n');
}
