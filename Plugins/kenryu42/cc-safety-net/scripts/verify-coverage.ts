#!/usr/bin/env bun

import { readFileSync } from 'node:fs';

export type CoverageSummary = Readonly<{
  lines: Readonly<{ hit: number; total: number }>;
  functions: Readonly<{ hit: number; total: number }>;
}>;

const COVERAGE_THRESHOLD = 0.9;

export function parseCoverageSummary(lcov: string): CoverageSummary {
  if (!lcov.trim()) throw new Error('LCOV report is empty');
  const lines = lcov.split(/\r?\n/);
  if (!lines.includes('end_of_record')) throw new Error('LCOV report has no complete records');
  const sum = (key: 'LF' | 'LH' | 'FNF' | 'FNH') =>
    lines
      .filter((line) => line.startsWith(`${key}:`))
      .reduce((total, line) => {
        const value = line.slice(key.length + 1);
        if (!/^\d+$/.test(value)) throw new Error(`Malformed LCOV ${key} value`);
        return total + Number(value);
      }, 0);
  return {
    lines: { hit: sum('LH'), total: sum('LF') },
    functions: { hit: sum('FNH'), total: sum('FNF') },
  };
}

export function verifyCoverageSummary(
  summary: CoverageSummary,
  threshold = COVERAGE_THRESHOLD,
): CoverageSummary {
  const unmeasured = (['lines', 'functions'] as const).filter(
    (metric) => summary[metric].total === 0,
  );
  if (unmeasured.length > 0) {
    throw new Error(`Coverage report has no measurable ${unmeasured.join(', ')}`);
  }
  const below = (['lines', 'functions'] as const).filter(
    (metric) => summary[metric].hit / summary[metric].total < threshold,
  );
  if (below.length > 0) {
    throw new Error(`Coverage below ${(threshold * 100).toFixed(2)}%: ${below.join(', ')}`);
  }
  return summary;
}

export function formatCoverageSummary(
  summary: CoverageSummary,
  threshold = COVERAGE_THRESHOLD,
): string {
  const format = (metric: keyof CoverageSummary) =>
    `${((summary[metric].hit / summary[metric].total) * 100).toFixed(2)}% (${summary[metric].hit}/${summary[metric].total})`;
  return `Coverage verified: lines ${format('lines')}, functions ${format('functions')}, minimum ${(threshold * 100).toFixed(2)}%.`;
}

export function verifyCoverageFile(path = 'coverage/lcov.info'): CoverageSummary {
  let content: string;
  try {
    content = readFileSync(path, 'utf-8');
  } catch (error) {
    throw new Error(`Coverage report is missing: ${path}`, { cause: error });
  }
  return verifyCoverageSummary(parseCoverageSummary(content));
}

if (import.meta.main) console.log(formatCoverageSummary(verifyCoverageFile(process.argv[2])));
