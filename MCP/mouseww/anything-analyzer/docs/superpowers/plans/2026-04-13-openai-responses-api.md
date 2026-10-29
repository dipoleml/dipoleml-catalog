# OpenAI Responses API Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OpenAI Responses API (`POST /responses`) support with user-selectable API type in settings.

**Architecture:** Extend `LLMProviderConfig` with optional `apiType` field, add a third code path `completeResponses()` in `LLMRouter`, and show a conditional API Type selector in `SettingsModal`. Existing Completions and Anthropic paths remain untouched.

**Tech Stack:** TypeScript, Electron, React 19, Ant Design 5, Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/shared/types.ts` | Modify (lines 118-128) | Add `OpenAIApiType` type, add `apiType?` to `LLMProviderConfig` |
| `src/main/ai/llm-router.ts` | Modify | Add routing branch, `completeResponses()`, `parseResponsesStream()` |
| `src/renderer/components/SettingsModal.tsx` | Modify | Add conditional API Type selector |
| `tests/main/ai/llm-router.test.ts` | Create | Unit tests for Responses API routing, body construction, stream parsing |

---

### Task 1: Add `OpenAIApiType` and Update `LLMProviderConfig`

**Files:**
- Modify: `src/shared/types.ts:118-128`

- [ ] **Step 1: Add the new type and update the interface**

In `src/shared/types.ts`, find the section starting at line 118 (`// ---- LLM Provider Config ----`) and replace it with:

```typescript
// ---- LLM Provider Config ----

export type LLMProviderType = "openai" | "anthropic" | "custom";
export type OpenAIApiType = "completions" | "responses";

export interface LLMProviderConfig {
  name: LLMProviderType;
  apiType?: OpenAIApiType;
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
}
```

The `apiType` field is optional so existing saved configs without it continue to work (defaults to `completions` behavior in the router).

- [ ] **Step 2: Verify the build compiles**

Run: `cd anything-register && npx electron-vite build`
Expected: Build succeeds. No existing code references `apiType` yet, so no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat(types): add OpenAIApiType and apiType field to LLMProviderConfig"
```

---

### Task 2: Write Tests for Responses API in LLMRouter

**Files:**
- Create: `tests/main/ai/llm-router.test.ts`

- [ ] **Step 1: Write the test file**

Create `tests/main/ai/llm-router.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LLMRouter } from '../../../src/main/ai/llm-router'
import type { LLMProviderConfig } from '../../../src/shared/types'

// Helper: create a mock Response with SSE stream
function createSSEResponse(events: Array<{ event?: string; data: string }>): Response {
  const lines = events
    .map(e => {
      const parts: string[] = []
      if (e.event) parts.push(`event: ${e.event}`)
      parts.push(`data: ${e.data}`)
      return parts.join('\n')
    })
    .join('\n\n') + '\n\n'

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(lines))
      controller.close()
    }
  })
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

// Helper: create a mock JSON Response
function createJSONResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  })
}

const baseConfig: LLMProviderConfig = {
  name: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: 'sk-test',
  model: 'gpt-4o',
  maxTokens: 4096
}

describe('LLMRouter', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('routing', () => {
    it('should route to completions endpoint when apiType is undefined', async () => {
      const config: LLMProviderConfig = { ...baseConfig }
      fetchSpy.mockResolvedValueOnce(createJSONResponse({
        choices: [{ message: { content: 'hello' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      }))

      const router = new LLMRouter(config)
      await router.complete([{ role: 'user', content: 'test' }])

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const [url] = fetchSpy.mock.calls[0]
      expect(url).toBe('https://api.openai.com/v1/chat/completions')
    })

    it('should route to completions endpoint when apiType is "completions"', async () => {
      const config: LLMProviderConfig = { ...baseConfig, apiType: 'completions' }
      fetchSpy.mockResolvedValueOnce(createJSONResponse({
        choices: [{ message: { content: 'hello' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      }))

      const router = new LLMRouter(config)
      await router.complete([{ role: 'user', content: 'test' }])

      const [url] = fetchSpy.mock.calls[0]
      expect(url).toBe('https://api.openai.com/v1/chat/completions')
    })

    it('should route to responses endpoint when apiType is "responses"', async () => {
      const config: LLMProviderConfig = { ...baseConfig, apiType: 'responses' }
      fetchSpy.mockResolvedValueOnce(createJSONResponse({
        output_text: 'hello',
        usage: { input_tokens: 10, output_tokens: 5 }
      }))

      const router = new LLMRouter(config)
      await router.complete([{ role: 'user', content: 'test' }])

      const [url] = fetchSpy.mock.calls[0]
      expect(url).toBe('https://api.openai.com/v1/responses')
    })
  })

  describe('completeResponses - request body', () => {
    it('should extract system message as instructions field', async () => {
      const config: LLMProviderConfig = { ...baseConfig, apiType: 'responses' }
      fetchSpy.mockResolvedValueOnce(createJSONResponse({
        output_text: 'result',
        usage: { input_tokens: 10, output_tokens: 5 }
      }))

      const router = new LLMRouter(config)
      await router.complete([
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' }
      ])

      const [, options] = fetchSpy.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body.instructions).toBe('You are a helpful assistant')
      expect(body.input).toEqual([{ role: 'user', content: 'Hello' }])
      expect(body.model).toBe('gpt-4o')
      expect(body.max_output_tokens).toBe(4096)
      expect(body).not.toHaveProperty('max_tokens')
      expect(body).not.toHaveProperty('messages')
    })

    it('should omit instructions when no system message', async () => {
      const config: LLMProviderConfig = { ...baseConfig, apiType: 'responses' }
      fetchSpy.mockResolvedValueOnce(createJSONResponse({
        output_text: 'result',
        usage: { input_tokens: 10, output_tokens: 5 }
      }))

      const router = new LLMRouter(config)
      await router.complete([{ role: 'user', content: 'Hello' }])

      const [, options] = fetchSpy.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body).not.toHaveProperty('instructions')
      expect(body.input).toEqual([{ role: 'user', content: 'Hello' }])
    })
  })

  describe('completeResponses - non-streaming', () => {
    it('should parse output_text and usage from response', async () => {
      const config: LLMProviderConfig = { ...baseConfig, apiType: 'responses' }
      fetchSpy.mockResolvedValueOnce(createJSONResponse({
        output_text: '# Report\nContent here',
        usage: { input_tokens: 100, output_tokens: 200 }
      }))

      const router = new LLMRouter(config)
      const result = await router.complete([{ role: 'user', content: 'test' }])

      expect(result.content).toBe('# Report\nContent here')
      expect(result.promptTokens).toBe(100)
      expect(result.completionTokens).toBe(200)
    })
  })

  describe('completeResponses - streaming', () => {
    it('should parse SSE events with event: prefix and call onChunk', async () => {
      const config: LLMProviderConfig = { ...baseConfig, apiType: 'responses' }
      fetchSpy.mockResolvedValueOnce(createSSEResponse([
        { event: 'response.output_text.delta', data: '{"delta":"Hello "}' },
        { event: 'response.output_text.delta', data: '{"delta":"world"}' },
        { event: 'response.completed', data: '{"response":{"usage":{"input_tokens":50,"output_tokens":30}}}' }
      ]))

      const router = new LLMRouter(config)
      const chunks: string[] = []
      const result = await router.complete(
        [{ role: 'user', content: 'test' }],
        (chunk) => chunks.push(chunk)
      )

      expect(chunks).toEqual(['Hello ', 'world'])
      expect(result.content).toBe('Hello world')
      expect(result.promptTokens).toBe(50)
      expect(result.completionTokens).toBe(30)
    })

    it('should set stream: true in request body when onChunk provided', async () => {
      const config: LLMProviderConfig = { ...baseConfig, apiType: 'responses' }
      fetchSpy.mockResolvedValueOnce(createSSEResponse([
        { event: 'response.output_text.delta', data: '{"delta":"Hi"}' },
        { event: 'response.completed', data: '{"response":{"usage":{"input_tokens":1,"output_tokens":1}}}' }
      ]))

      const router = new LLMRouter(config)
      await router.complete([{ role: 'user', content: 'test' }], () => {})

      const [, options] = fetchSpy.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body.stream).toBe(true)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd anything-register && npx vitest run tests/main/ai/llm-router.test.ts`
Expected: FAIL — the routing tests for `apiType: 'responses'` will fail because `completeResponses()` doesn't exist yet. The completions routing tests should already pass.

- [ ] **Step 3: Commit the test file**

```bash
git add tests/main/ai/llm-router.test.ts
git commit -m "test: add unit tests for OpenAI Responses API in LLMRouter"
```

---

### Task 3: Implement `completeResponses()` and `parseResponsesStream()` in LLMRouter

**Files:**
- Modify: `src/main/ai/llm-router.ts`

- [ ] **Step 1: Update the routing logic in `complete()` method**

In `src/main/ai/llm-router.ts`, replace the `complete()` method (lines 23-28):

Old:
```typescript
  async complete(messages: ChatMessage[], onChunk?: (chunk: string) => void): Promise<LLMResponse> {
    if (this.config.name === 'anthropic') {
      return this.completeAnthropic(messages, onChunk)
    }
    return this.completeOpenAI(messages, onChunk)
  }
```

New:
```typescript
  async complete(messages: ChatMessage[], onChunk?: (chunk: string) => void): Promise<LLMResponse> {
    if (this.config.name === 'anthropic') {
      return this.completeAnthropic(messages, onChunk)
    }
    if (this.config.apiType === 'responses') {
      return this.completeResponses(messages, onChunk)
    }
    return this.completeOpenAI(messages, onChunk)
  }
```

- [ ] **Step 2: Add `completeResponses()` method**

Insert the following method after the `completeOpenAI()` method (after line 45, before `completeAnthropic()`):

```typescript
  private async completeResponses(messages: ChatMessage[], onChunk?: (chunk: string) => void): Promise<LLMResponse> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/responses`
    const stream = !!onChunk
    const systemMsg = messages.find(m => m.role === 'system')
    const inputMessages = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }))
    const body: Record<string, unknown> = { model: this.config.model, input: inputMessages, max_output_tokens: this.config.maxTokens, stream }
    if (systemMsg) body.instructions = systemMsg.content

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.config.apiKey}` },
      body: JSON.stringify(body)
    })

    if (stream) return this.parseResponsesStream(response, onChunk!)

    const data = await response.json() as { output_text?: string; usage?: { input_tokens: number; output_tokens: number } }
    return { content: data.output_text || '', promptTokens: data.usage?.input_tokens || 0, completionTokens: data.usage?.output_tokens || 0 }
  }
```

- [ ] **Step 3: Add `parseResponsesStream()` method**

Insert the following method after `parseOpenAIStream()` (after line 95, before `parseAnthropicStream()`):

```typescript
  private async parseResponsesStream(response: Response, onChunk: (chunk: string) => void): Promise<LLMResponse> {
    let fullContent = '', promptTokens = 0, completionTokens = 0
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')
    const decoder = new TextDecoder()
    let buffer = ''
    let currentEvent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) { currentEvent = ''; continue }
        if (trimmed.startsWith('event: ')) { currentEvent = trimmed.slice(7); continue }
        if (!trimmed.startsWith('data: ')) continue
        try {
          const parsed = JSON.parse(trimmed.slice(6)) as any
          if (currentEvent === 'response.output_text.delta' && parsed.delta) {
            fullContent += parsed.delta
            onChunk(parsed.delta)
          }
          if (currentEvent === 'response.completed' && parsed.response?.usage) {
            promptTokens = parsed.response.usage.input_tokens || 0
            completionTokens = parsed.response.usage.output_tokens || 0
          }
        } catch { /* skip malformed JSON */ }
      }
    }
    return { content: fullContent, promptTokens, completionTokens }
  }
```

- [ ] **Step 4: Run all tests to verify they pass**

Run: `cd anything-register && npx vitest run tests/main/ai/llm-router.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run the full test suite**

Run: `cd anything-register && npx vitest run`
Expected: All tests PASS (including existing scene-detector and migration tests).

- [ ] **Step 6: Verify the build compiles**

Run: `cd anything-register && npx electron-vite build`
Expected: Build succeeds with no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/main/ai/llm-router.ts
git commit -m "feat(llm-router): add completeResponses and parseResponsesStream for OpenAI Responses API"
```

---

### Task 4: Add API Type Selector to SettingsModal

**Files:**
- Modify: `src/renderer/components/SettingsModal.tsx`

- [ ] **Step 1: Import `OpenAIApiType` type**

In `src/renderer/components/SettingsModal.tsx`, update the import on line 3:

Old:
```typescript
import type { LLMProviderConfig, LLMProviderType } from '@shared/types'
```

New:
```typescript
import type { LLMProviderConfig, LLMProviderType, OpenAIApiType } from '@shared/types'
```

- [ ] **Step 2: Add `shouldWatch` and `Form.useWatch` for conditional rendering**

At the top of the component function (after `const [form] = Form.useForm()` on line 14), add:

```typescript
  const providerValue = Form.useWatch('name', form)
  const showApiType = providerValue === 'openai' || providerValue === 'custom'
```

- [ ] **Step 3: Update `handleProviderChange` to manage `apiType`**

Replace the `handleProviderChange` function (lines 24-26):

Old:
```typescript
  const handleProviderChange = (value: LLMProviderType) => {
    form.setFieldValue('baseUrl', defaultUrls[value])
  }
```

New:
```typescript
  const handleProviderChange = (value: LLMProviderType) => {
    form.setFieldValue('baseUrl', defaultUrls[value])
    if (value === 'anthropic') {
      form.setFieldValue('apiType', undefined)
    } else if (!form.getFieldValue('apiType')) {
      form.setFieldValue('apiType', 'completions')
    }
  }
```

- [ ] **Step 4: Update `initialValues` to include `apiType`**

In the `<Form>` component (line 37), update `initialValues`:

Old:
```typescript
        <Form form={form} layout="vertical" initialValues={{ name: 'openai', baseUrl: defaultUrls.openai, maxTokens: 4096 }}>
```

New:
```typescript
        <Form form={form} layout="vertical" initialValues={{ name: 'openai', baseUrl: defaultUrls.openai, maxTokens: 4096, apiType: 'completions' as OpenAIApiType }}>
```

- [ ] **Step 5: Add the API Type form field**

After the Provider `<Form.Item>` (after line 43, before the Base URL item), insert:

```tsx
        {showApiType && (
          <Form.Item name="apiType" label="API Type">
            <Select options={[
              { label: 'Chat Completions (/chat/completions)', value: 'completions' },
              { label: 'Responses (/responses)', value: 'responses' }
            ]} />
          </Form.Item>
        )}
```

- [ ] **Step 6: Verify the complete file**

The full `SettingsModal.tsx` should now be:

```tsx
import { useEffect } from 'react'
import { Modal, Form, Input, Select, InputNumber, message } from 'antd'
import type { LLMProviderConfig, LLMProviderType, OpenAIApiType } from '@shared/types'

const defaultUrls: Record<LLMProviderType, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  custom: ''
}

interface Props { open: boolean; onClose: () => void }

export default function SettingsModal({ open, onClose }: Props) {
  const [form] = Form.useForm()
  const providerValue = Form.useWatch('name', form)
  const showApiType = providerValue === 'openai' || providerValue === 'custom'

  useEffect(() => {
    if (open) {
      window.electronAPI.getLLMConfig().then(config => {
        if (config) form.setFieldsValue(config)
      })
    }
  }, [open, form])

  const handleProviderChange = (value: LLMProviderType) => {
    form.setFieldValue('baseUrl', defaultUrls[value])
    if (value === 'anthropic') {
      form.setFieldValue('apiType', undefined)
    } else if (!form.getFieldValue('apiType')) {
      form.setFieldValue('apiType', 'completions')
    }
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    await window.electronAPI.saveLLMConfig(values as LLMProviderConfig)
    message.success('LLM configuration saved')
    onClose()
  }

  return (
    <Modal title="LLM Settings" open={open} onOk={handleSave} onCancel={onClose} okText="Save">
      <Form form={form} layout="vertical" initialValues={{ name: 'openai', baseUrl: defaultUrls.openai, maxTokens: 4096, apiType: 'completions' as OpenAIApiType }}>
        <Form.Item name="name" label="Provider" rules={[{ required: true }]}>
          <Select onChange={handleProviderChange} options={[
            { label: 'OpenAI', value: 'openai' },
            { label: 'Anthropic', value: 'anthropic' },
            { label: 'Custom (OpenAI Compatible)', value: 'custom' }
          ]} />
        </Form.Item>
        {showApiType && (
          <Form.Item name="apiType" label="API Type">
            <Select options={[
              { label: 'Chat Completions (/chat/completions)', value: 'completions' },
              { label: 'Responses (/responses)', value: 'responses' }
            ]} />
          </Form.Item>
        )}
        <Form.Item name="baseUrl" label="Base URL" rules={[{ required: true }]}>
          <Input placeholder="https://api.openai.com/v1" />
        </Form.Item>
        <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}>
          <Input.Password placeholder="sk-..." />
        </Form.Item>
        <Form.Item name="model" label="Model" rules={[{ required: true }]}>
          <Input placeholder="gpt-4o / claude-sonnet-4-20250514 / ..." />
        </Form.Item>
        <Form.Item name="maxTokens" label="Max Tokens">
          <InputNumber min={256} max={128000} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
```

- [ ] **Step 7: Verify the build compiles**

Run: `cd anything-register && npx electron-vite build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/renderer/components/SettingsModal.tsx
git commit -m "feat(settings): add API Type selector for OpenAI Responses API"
```

---

### Task 5: End-to-End Verification

**Files:**
- No file changes — manual testing only

- [ ] **Step 1: Run the full test suite**

Run: `cd anything-register && npx vitest run`
Expected: All tests pass (scene-detector, migrations, llm-router).

- [ ] **Step 2: Run the build**

Run: `cd anything-register && npx electron-vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Launch dev mode and verify settings UI**

Run: `cd anything-register && npx electron-vite dev`

In the app:
1. Open Settings (gear icon)
2. Verify: When Provider is "OpenAI" or "Custom", the "API Type" selector appears with "Chat Completions" and "Responses" options
3. Verify: When switching to "Anthropic", the "API Type" selector disappears
4. Verify: Selecting "Responses" and saving persists correctly (reopen settings to confirm)

- [ ] **Step 4: (Optional) Test with a real OpenAI API key**

If you have an OpenAI API key:
1. Set Provider: OpenAI, API Type: Responses, Model: gpt-4o
2. Navigate to a website in the embedded browser
3. Click "Start Analysis"
4. Verify streaming works and a report is generated

Expected: The analysis report streams in and completes normally, same as Completions mode.
