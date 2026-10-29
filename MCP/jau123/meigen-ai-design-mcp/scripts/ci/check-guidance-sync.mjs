import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = process.argv[2]
if (!webRoot || process.argv.length > 4 || (process.argv[3] && process.argv[3] !== '--published')) {
  console.error('Usage: node scripts/ci/check-guidance-sync.mjs /path/to/meigen-web [--published]')
  process.exit(1)
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const normalize = text => text.replace(/^\/\*\*[^\n]*\*\/\r?\n/, '').replaceAll('\r\n', '\n')
try {
  const local = normalize(readFileSync(resolve(root, 'src/lib/skill-guidance.ts'), 'utf8'))
  const remote = normalize(readFileSync(resolve(webRoot, 'src/lib/skills/mcp-guidance.ts'), 'utf8'))
  if (local.replaceAll(/meigen@[0-9.]+/g, 'meigen@VERSION') !== remote.replaceAll(/meigen@[0-9.]+/g, 'meigen@VERSION')) throw new Error('Guidance differs between npm and the specified Web checkout.')
  const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version
  const pins = [...remote.matchAll(/meigen@([^'"\s,\]]+)/g)].map(match => match[1])
  if (!pins.length || pins.some(pin => !/^\d+\.\d+\.\d+$/.test(pin) || pin.localeCompare('2.0.1', undefined, { numeric: true }) < 0 || pin.localeCompare(version, undefined, { numeric: true }) > 0)) throw new Error('Web guidance must pin a version from 2.0.1 through the prepared npm version.')
  if (process.argv.includes('--published')) for (const pin of new Set(pins)) {
    const published = execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['view', `meigen@${pin}`, 'version', '--json'], { encoding: 'utf8', timeout: 30_000 }).trim()
    if (JSON.parse(published) !== pin) throw new Error(`Web pin is not published: ${pin}`)
  }
  const pages = ['src/app/mcp/content.ts', 'src/app/mcp/McpLanding.tsx', 'src/app/mcp/page.tsx']
  for (const path of pages) {
    const source = readFileSync(resolve(webRoot, path), 'utf8')
    const publicPins = [...source.matchAll(/\b([0-9]+\.[0-9]+\.[0-9]+)\b/g)].map(match => match[1])
    const family = pins[0].split('.').slice(0, 2).join('.')
    if ([...source.matchAll(/MeiGen MCP(?: ·)? ([0-9]+\.[0-9]+)/g)].some(match => match[1] !== family)) throw new Error(`Public MCP release label drift: ${path}`)
    if (publicPins.some(pin => pin !== pins[0])) throw new Error(`Public installation/version metadata drift: ${path}`)
  }
  for (const [localPath, remotePath] of [
    ['src/lib/gallery.ts', 'src/lib/mcp-gallery.ts'],
    ['src/lib/search-previews.ts', 'src/lib/mcp-search-previews.ts'],
  ]) {
    if (readFileSync(resolve(root, localPath), 'utf8') !== readFileSync(resolve(webRoot, remotePath), 'utf8')) {
      throw new Error(`Search preview implementation differs: ${localPath}`)
    }
  }
  console.log('Cross-repository guidance, npm pin and search preview implementations match.')
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Guidance check failed.')
  process.exitCode = 1
}
