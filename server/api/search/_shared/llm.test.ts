import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildFallbackSearchAnswer, generateSearchAnswerStream } from './llm'

const originalEnv = {
  apiKey: process.env.OPENAI_API_KEY,
  apiBase: process.env.OPENAI_API_BASE,
  model: process.env.MODEL_NAME,
}

afterEach(() => {
  vi.restoreAllMocks()
  process.env.OPENAI_API_KEY = originalEnv.apiKey
  process.env.OPENAI_API_BASE = originalEnv.apiBase
  process.env.MODEL_NAME = originalEnv.model
})

describe('generateSearchAnswerStream', () => {
  it('parses SSE across chunk boundaries and emits answer deltas', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.OPENAI_API_BASE = 'https://llm.example.com/v1'
    process.env.MODEL_NAME = 'test-model'

    const encoder = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode('data: {"choices":[{"delta":{"content":"第一段"}}]}\n\nda')
        )
        controller.enqueue(
          encoder.encode('ta: {"choices":[{"delta":{"content":"第二段"}}]}\n\ndata: [DONE]\n\n')
        )
        controller.close()
      },
    })
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(body, { status: 200 }))

    const deltas: string[] = []
    const result = await generateSearchAnswerStream('测试提示词', delta => deltas.push(delta))

    expect(deltas).toEqual(['第一段', '第二段'])
    expect(result).toEqual({ content: '第一段第二段', messageStatus: 'completed' })

    const requestInit = vi.mocked(globalThis.fetch).mock.calls[0]?.[1]
    const requestBody = JSON.parse(String(requestInit?.body))
    expect(requestBody).toMatchObject({
      model: 'test-model',
      stream: true,
      max_tokens: 1000,
    })
  })
})

describe('buildFallbackSearchAnswer', () => {
  it('marks fallback answers as failed even when evidence exists', () => {
    const result = buildFallbackSearchAnswer({
      query: 'Pompe disease gene therapy',
      evidence: [
        {
          sourceType: 'reference',
          sourceTier: 'authority',
          sourceLabel: 'NORD',
          sourceUrl: 'https://rarediseases.org/example',
          sourceDomain: 'rarediseases.org',
          snippet: 'Snippet',
          publishedAt: null,
          title: 'NORD update',
          content: 'Snippet',
        },
      ],
    })

    expect(result.messageStatus).toBe('failed')
  })
})
