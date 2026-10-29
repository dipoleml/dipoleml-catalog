import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'

/** Preserve image/text previews for pre-2025-06-18 clients whose schema rejects resource_link. */
export function compatibleTransport(inner: Transport): Transport {
  let protocol = '2024-11-05'
  const wrapper: Transport = {
    get sessionId() { return inner.sessionId },
    async start() {
      inner.onmessage = (message, extra) => wrapper.onmessage?.(message, extra)
      inner.onclose = () => wrapper.onclose?.()
      inner.onerror = error => wrapper.onerror?.(error)
      await inner.start()
    },
    async send(message, options) {
      if ('result' in message) {
        if (typeof message.result.protocolVersion === 'string') protocol = message.result.protocolVersion
        if (protocol < '2025-06-18' && Array.isArray(message.result.content)) message = {
          ...message, result: { ...message.result, content: message.result.content.map((item: Record<string, unknown>) => item.type === 'resource_link'
            ? { type: 'text', text: `${String(item.name ?? 'Result')}: ${String(item.uri)}` } : item) },
        }
      }
      await inner.send(message, options)
    },
    setProtocolVersion(version) { protocol = version; inner.setProtocolVersion?.(version) },
    close: () => inner.close(),
  }
  return wrapper
}
