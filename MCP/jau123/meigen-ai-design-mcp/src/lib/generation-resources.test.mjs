import { test } from 'node:test'
import assert from 'node:assert/strict'
import sourceModule from './generation-contract.js'
const { generationResult } = sourceModule
test('completed resources supplement unchanged structured JSON and local save paths without duplication', () => {
  const body = { success: true, status: 'completed', provider: 'meigen', mediaType: 'image', urls: ['https://images.meigen.ai/a.png', 'https://images.meigen.ai/a.png'], imageUrl: 'https://images.meigen.ai/a.png', savedPath: '/tmp/test-only-result.png' }
  const result = generationResult(body)
  assert.deepEqual(result.structuredContent, body)
  assert.deepEqual(JSON.parse(result.content[0].text), body)
  assert.deepEqual(result.content.slice(1), [{ type: 'resource_link', uri: body.imageUrl, name: 'MeiGen image 1', mimeType: 'image/png' }])
})
test('pending or failed results never publish old media; only public HTTPS artifacts become resources', () => {
  for (const status of ['processing', 'failed', 'unknown']) assert.equal(generationResult({ success: true, status, urls: ['https://images.meigen.ai/a.png'] }).content.length, 1)
  const result = generationResult({ success: true, status: 'completed', mediaType: 'video', urls: ['https://images.meigen.ai/a.mp4', 'https://user:password@example.test/a.png', 'file:///tmp/result.png', 'not-a-url'] })
  assert.deepEqual(result.content.slice(1), [{ type: 'resource_link', uri: 'https://images.meigen.ai/a.mp4', name: 'MeiGen video 1', mimeType: 'video/mp4' }])
})
