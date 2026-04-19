import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateKnowledgeEmbedding, getEmbeddingConfig } from './embeddings'

describe('knowledge embeddings', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('falls back to OpenAI-compatible environment variables when embedding-specific keys are absent', () => {
    process.env.OPENAI_API_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    process.env.OPENAI_API_KEY = 'dashscope-key'
    delete process.env.EMBEDDING_API_BASE
    delete process.env.EMBEDDING_API_KEY

    expect(getEmbeddingConfig()).toEqual({
      apiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: 'dashscope-key',
      model: 'text-embedding-v4',
      dimensions: 1024,
    })
  })

  it('requests a single query embedding from an OpenAI-compatible embeddings endpoint', async () => {
    process.env.EMBEDDING_API_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    process.env.EMBEDDING_API_KEY = 'embedding-key'
    process.env.EMBEDDING_MODEL = 'text-embedding-v4'
    process.env.EMBEDDING_DIMENSIONS = '1024'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(generateKnowledgeEmbedding('FSHD 麻醉')).resolves.toEqual([0.1, 0.2, 0.3])
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer embedding-key',
        }),
        body: JSON.stringify({
          model: 'text-embedding-v4',
          input: 'FSHD 麻醉',
          dimensions: 1024,
        }),
      })
    )
  })
})
