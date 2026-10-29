/**
 * Where the version appears as a literal string inside text files, and how it
 * should read at the current version.
 *
 * Shared by bump-version.mjs (which rewrites these) and validate-repo.mjs
 * (which fails the build when one falls behind), so the two can never disagree
 * about what carries a version. Keeping a separate list in each is exactly what
 * let the localized README badges — and then the docs landing page's JSON-LD —
 * go stale unnoticed: propagation and validation shared the same blind spot.
 *
 * Files are discovered from disk, so a new translation or docs page is covered
 * on arrival. Structured manifests (package.json and the four plugin manifests)
 * are NOT here: they hold the version in a real JSON field and are read/written
 * as JSON, not by pattern.
 */

import { readdirSync } from "node:fs";
import path from "node:path";

/**
 * The `uses:` pin on the documented GitHub Action, shared by the README
 * examples and the full template under docs/.
 *
 * It is a version reference like any badge, and a worse one to let rot: a pin
 * naming a release that predates an input documented beside it makes GitHub
 * answer `Unexpected input(s)` and the input silently do nothing. README.md
 * demonstrated `api-base-url` — added in 1.6.0 — against a `@v1.4.3` pin for
 * three releases, with validation green the whole time, because only the badge
 * on the same page was tracked here.
 */
const ACTION_PIN = {
  pattern: /brooks-lint\/\.github\/actions\/brooks-lint@v[\d.]+/g,
  render: (v) => `brooks-lint/.github/actions/brooks-lint@v${v}`,
  required: true,
};

const KINDS = [
  {
    // Shields.io badge at the top of every README translation.
    dir: ".",
    include: (f) => f.startsWith("README") && f.endsWith(".md"),
    pattern: /version-[\d.]+-blue\.svg/g,
    render: (v) => `version-${v}-blue.svg`,
    required: true,
  },
  {
    // The CI/CD section's example, in every README translation.
    dir: ".",
    include: (f) => f.startsWith("README") && f.endsWith(".md"),
    ...ACTION_PIN,
  },
  {
    // The full workflow template the READMEs link to.
    dir: "docs",
    include: (f) => f === "github-action-example.yml",
    ...ACTION_PIN,
  },
  {
    // schema.org SoftwareApplication metadata on the GitHub Pages site.
    // Only the landing page carries JSON-LD, hence not required.
    dir: "docs",
    include: (f) => f.endsWith(".html"),
    pattern: /"softwareVersion": "[\d.]+"/g,
    render: (v) => `"softwareVersion": "${v}"`,
    required: false,
  },
];

/**
 * Every version reference in a text file, as
 * `{ rel, pattern, expected, required }` — `expected` being the exact text each
 * `pattern` match should equal at `version`. One entry per reference, not per
 * file: a README carries two (its badge and the action pin) and so appears
 * twice.
 */
export function versionRefs(root, version) {
  return KINDS.flatMap(({ dir, include, pattern, render, required }) =>
    readdirSync(path.join(root, dir))
      .filter(include)
      .sort()
      .map((file) => ({
        rel: path.join(dir, file),
        pattern,
        expected: render(version),
        required,
      })),
  );
}
