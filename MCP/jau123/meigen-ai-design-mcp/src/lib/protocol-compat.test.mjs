import test from 'node:test'
import assert from 'node:assert/strict'
import compatModule from './protocol-compat.js'
const { compatibleTransport } = compatModule

for (const protocol of ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25']) {
  test(`transport adapts result content to negotiated ${protocol} without changing image or structured result`, async () => {
    const sent = []
    const inner = { async start() {}, async close() {}, async send(message) { sent.push(message) } }
    const transport = compatibleTransport(inner)
    const received = []
    transport.onmessage = message => received.push(message)
    await transport.start()
    inner.onmessage({ jsonrpc: '2.0', method: 'notifications/initialized' })
    assert.equal(received.length, 1)
    await transport.send({ jsonrpc: '2.0', id: 1, result: { protocolVersion: protocol } })
    const text = { type: 'text', text: 'original' }, image = { type: 'image', mimeType: 'image/jpeg', data: 'AA==' }
    const resource = { type: 'resource_link', uri: 'https://images.meigen.ai/a.png', name: 'Preview' }
    const body = { urls: [resource.uri], savedPath: '/tmp/fixture.png' }
    await transport.send({ jsonrpc: '2.0', id: 2, result: { structuredContent: body, content: [text, image, resource] } })
    assert.deepEqual(sent[1].result.structuredContent, body)
    assert.deepEqual(sent[1].result.content, [text, image, protocol < '2025-06-18' ? { type: 'text', text: `Preview: ${resource.uri}` } : resource])
    assert.equal(resource.type, 'resource_link')
    await transport.close()
  })
}
