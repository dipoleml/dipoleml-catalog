import sharp from 'sharp'

// Kept identical in the Web remote MCP and the published stdio package.
const MAX_SOURCE_BYTES = 8 * 1024 * 1024
const MAX_PREVIEW_BYTES = 256 * 1024
export type SearchPreviewContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: 'image/jpeg' }
  | { type: 'resource_link'; uri: string; name: string; mimeType?: string }

function imageUrl(value: string | null | undefined): URL | undefined {
  if (!value) return
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && !url.username && !url.password && /\.(png|jpe?g|webp|avif|gif)$/i.test(url.pathname)) return url
  } catch { /* Invalid gallery metadata is not a preview URL. */ }
}

async function thumbnail(url: URL, parent?: AbortSignal): Promise<string> {
  // Only known public MeiGen image assets; never fetch user-controlled hosts,
  // credentials, query strings, arbitrary CDN transforms or redirect targets.
  if (url.origin !== 'https://images.meigen.ai' || url.search || url.hash ||
    !/^\/[A-Za-z0-9_./-]+$/.test(url.pathname) || url.pathname.startsWith('/cdn-cgi/')) throw new Error('unsupported_preview')
  const controller = new AbortController()
  const abort = () => controller.abort()
  parent?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, 4000)
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  try {
    parent?.throwIfAborted()
    const response = await fetch(url.href, { redirect: 'error', credentials: 'omit', signal: controller.signal, headers: { Accept: 'image/*' } })
    if (!response.ok || !/^image\/(png|jpeg|webp|avif|gif)(?:;|$)/i.test(response.headers.get('content-type') ?? '') ||
      Number(response.headers.get('content-length')) > MAX_SOURCE_BYTES || !response.body) {
      void response.body?.cancel().catch(() => {})
      throw new Error('unavailable_preview')
    }
    reader = response.body.getReader()
    const cancel = () => { void reader?.cancel().catch(() => {}) }
    controller.signal.addEventListener('abort', cancel, { once: true })
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      for (;;) {
        controller.signal.throwIfAborted()
        const chunk = await reader.read()
        controller.signal.throwIfAborted()
        if (chunk.done) break
        size += chunk.value.byteLength
        if (size > MAX_SOURCE_BYTES) throw new Error('oversized_preview')
        chunks.push(chunk.value)
      }
    } finally { controller.signal.removeEventListener('abort', cancel) }
    const bytes = await sharp(Buffer.concat(chunks, size), { limitInputPixels: 16_000_000, animated: false })
      .timeout({ seconds: 2 }).rotate().resize({ width: 384, height: 384, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' }).jpeg({ quality: 65 }).toBuffer()
    controller.signal.throwIfAborted()
    if (bytes.length > MAX_PREVIEW_BYTES) throw new Error('oversized_preview')
    return bytes.toString('base64')
  } finally {
    clearTimeout(timer)
    parent?.removeEventListener('abort', abort)
    if (reader) { void reader.cancel().catch(() => {}); reader.releaseLock() }
  }
}

/** At most three bounded inline images. Failure retains the entry and its link. */
export async function searchPreviewContent(entries: readonly { id: string; previewUrl?: string | null }[], signal?: AbortSignal): Promise<SearchPreviewContent[]> {
  const pending = new Map<string, Promise<string>>()
  const groups = await Promise.all(entries.slice(0, 3).map(async (entry, index): Promise<SearchPreviewContent[]> => {
    const url = imageUrl(entry.previewUrl)
    if (!url) return [{ type: 'text', text: `Preview ${index + 1} (${entry.id}) unavailable. Use get_inspiration for the full prompt.` }]
    const name = `Preview ${index + 1} (${entry.id})`
    const ext = url.pathname.split('.').pop()!.toLowerCase()
    const mimeType = ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif' } as Record<string, string>)[ext]
    const content: SearchPreviewContent[] = [{ type: 'text', text: name }, { type: 'resource_link', uri: url.href, name, mimeType }]
    try {
      let image = pending.get(url.href)
      if (!image) { image = thumbnail(url, signal); pending.set(url.href, image) }
      content.push({ type: 'image', data: await image, mimeType: 'image/jpeg' })
    } catch {
      // Optional display failure never hides a successful search or logs asset URLs.
      content.push({ type: 'text', text: 'Inline preview unavailable. Use the image link or get_inspiration; do not repeat the search just to retry a preview.' })
    }
    return content
  }))
  return groups.flat()
}
