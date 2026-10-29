import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import sourceModule from './search-previews.js'
const { searchPreviewContent } = sourceModule
test('returns at most three real JPEG thumbnails, with bounded dimensions and no metadata or credentials', async () => {
  const previous = globalThis.fetch
  const source = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#55aa99' } }).png().withMetadata().toBuffer()
  const seen = []
  globalThis.fetch = async (url, init) => {
    seen.push({ url, init })
    return new Response(new Uint8Array(source), { headers: { 'content-type': 'image/png' } })
  }
  try {
    const result = await searchPreviewContent(Array.from({ length: 9 }, (_, index) => ({ id: `hit-${index}`, previewUrl: `https://images.meigen.ai/${index}.png` })))
    const images = result.filter(item => item.type === 'image')
    assert.equal(images.length, 3)
    assert.equal(result.filter(item => item.type === 'resource_link').length, 3)
    assert.equal(seen.length, 3)
    for (const image of images) {
      assert.equal(image.mimeType, 'image/jpeg')
      const meta = await sharp(Buffer.from(image.data, 'base64')).metadata()
      assert.equal(meta.width, 384); assert.equal(meta.height, 192)
      assert.equal(meta.format, 'jpeg'); assert.equal(meta.exif, undefined)
      assert.ok(Buffer.byteLength(image.data, 'base64') <= 256 * 1024)
    }
    for (const request of seen) {
      assert.equal(new Headers(request.init.headers).get('authorization'), null)
      assert.equal(request.init.redirect, 'error')
      assert.equal(request.init.credentials, 'omit')
    }
  } finally { globalThis.fetch = previous }
})
test('does not fetch arbitrary hosts, transforms, signed URLs, credentials, videos or malformed URLs', async () => {
  const previous = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('must not fetch') }
  try {
    for (const previewUrl of ['https://evil.example/a.jpg', 'https://images.meigen.ai.evil.test/a.jpg', 'https://127.0.0.1/a.jpg',
      'http://images.meigen.ai/a.jpg', 'https://user:secret@images.meigen.ai/a.jpg', 'https://images.meigen.ai/cdn-cgi/image/width=100/https://evil.test/a.jpg',
      'https://images.meigen.ai/a.jpg?token=secret', 'https://images.meigen.ai/a.mp4', 'javascript:alert(1)', undefined]) {
      const result = await searchPreviewContent([{ id: 'a', previewUrl }])
      assert.equal(result.some(item => item.type === 'image'), false)
      assert.match(JSON.stringify(result), /unavailable/)
    }
    assert.equal(calls, 0)
  } finally { globalThis.fetch = previous }
})
test('oversized headers, chunked bodies, corrupt images and HTTP failures retain result links', async () => {
  const previous = globalThis.fetch
  try {
    for (const make of [
      () => new Response('x', { headers: { 'content-type': 'image/jpeg', 'content-length': String(9 * 1024 * 1024) } }),
      () => new Response(new Uint8Array(8 * 1024 * 1024 + 1), { headers: { 'content-type': 'image/jpeg' } }),
      () => new Response('not an image', { headers: { 'content-type': 'image/jpeg' } }),
      () => new Response('unavailable', { status: 503 }),
      () => new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } }),
    ]) {
      globalThis.fetch = async () => make()
      const result = await searchPreviewContent([{ id: 'a', previewUrl: 'https://images.meigen.ai/a.jpg' }])
      assert.equal(result.filter(item => item.type === 'resource_link').length, 1)
      assert.equal(result.some(item => item.type === 'image'), false)
      assert.match(JSON.stringify(result), /Inline preview unavailable/)
    }
  } finally { globalThis.fetch = previous }
})
test('cancellation stops an unfinished body and duplicate previews download only once', async () => {
  const previous = globalThis.fetch
  let cancelled = false, calls = 0
  const controller = new AbortController()
  globalThis.fetch = async () => {
    calls++
    return new Response(new ReadableStream({ start() { setTimeout(() => controller.abort(), 5) }, cancel() { cancelled = true } }), { headers: { 'content-type': 'image/jpeg' } })
  }
  try {
    const result = await searchPreviewContent([{ id: 'one', previewUrl: 'https://images.meigen.ai/a.jpg' }, { id: 'two', previewUrl: 'https://images.meigen.ai/a.jpg' }], controller.signal)
    assert.equal(calls, 1); assert.equal(cancelled, true)
    assert.equal(result.filter(item => item.type === 'resource_link').length, 2)
    assert.equal(result.some(item => item.type === 'image'), false)
  } finally { globalThis.fetch = previous }
})
