/**
 * Bundle Scanner - Extract data-ds attributes from build output
 *
 * Scans Vite/Webpack build output for data-ds attributes
 * to validate injection and production stripping.
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { ParsedBundle } from '../../shared/types.js';

/**
 * Scan bundle output and extract data-ds attributes
 */
export async function scanBundleForDataDs(
  outputDir: string,
): Promise<ParsedBundle> {
  const files = await readdir(outputDir, { recursive: true });

  let html = '';
  let js = '';

  // Read all HTML and JS files
  for (const file of files) {
    const filePath = join(outputDir, file.toString());

    if (file.toString().endsWith('.html')) {
      html += await readFile(filePath, 'utf-8');
    } else if (
      file.toString().endsWith('.js') ||
      file.toString().endsWith('.mjs')
    ) {
      js += await readFile(filePath, 'utf-8');
    }
  }

  // Extract data-ds attributes
  const dataDs = extractDataDsAttributes(html + js);

  // Count total elements (approximate)
  const elementCount = countElements(html);

  return {
    html,
    js,
    dataDs,
    elementCount,
  };
}

/**
 * Valid nanoid pattern for data-ds values (8-char base-36ish).
 * Used to filter out false positives from template literals in
 * compiled JS (e.g., `data-ds="${o}"` in minified Vite output).
 */
const NANOID_PATTERN = /^[0-9A-HJ-NP-Za-hj-np-z]{8}$/;

/**
 * Extract all data-ds attribute values from content.
 * Handles HTML attributes (`data-ds="id"`), compiled JSX
 * props (`"data-ds":"id"`), and template literals (`data-ds="${expr}"`).
 */
function extractDataDsAttributes(content: string): string[] {
  const regex = /["']?data-ds["']?\s*[=:]\s*"([^"]+)"/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    // Only keep values that look like valid nanoid IDs — skip
    // template expressions like ${o} from minified JS
    if (NANOID_PATTERN.test(match[1])) {
      matches.push(match[1]);
    }
  }

  // Deduplicate
  return Array.from(new Set(matches));
}

/**
 * Count HTML elements in content (approximate)
 */
function countElements(html: string): number {
  // Match opening tags
  const regex = /<([a-z][a-z0-9]*)\b[^>]*>/gi;
  const matches = html.match(regex);
  return matches ? matches.length : 0;
}
