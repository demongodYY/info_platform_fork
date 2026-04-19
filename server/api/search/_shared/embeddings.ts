export interface EmbeddingConfig {
  apiBase: string
  apiKey: string
  model: string
  dimensions: number
}

export function getEmbeddingConfig(): EmbeddingConfig | null {
  const apiBase = process.env.EMBEDDING_API_BASE || process.env.OPENAI_API_BASE || ''
  const apiKey = process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY || ''
  const model = process.env.EMBEDDING_MODEL || 'text-embedding-v4'
  const dimensions = Number(process.env.EMBEDDING_DIMENSIONS || 1024)

  if (!apiBase || !apiKey) return null

  return {
    apiBase: apiBase.replace(/\/$/, ''),
    apiKey,
    model,
    dimensions: Number.isFinite(dimensions) ? dimensions : 1024,
  }
}

export async function generateKnowledgeEmbedding(input: string): Promise<number[] | null> {
  const trimmed = input.trim()
  const config = getEmbeddingConfig()
  if (!trimmed || !config) return null

  const response = await fetch(`${config.apiBase}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: trimmed,
      dimensions: config.dimensions,
    }),
  })

  if (!response.ok) {
    throw new Error(`Embedding request failed with ${response.status}`)
  }

  const payload = (await response.json()) as {
    data?: Array<{
      embedding?: unknown
    }>
  }
  const embedding = payload.data?.[0]?.embedding
  if (!Array.isArray(embedding)) return null

  return embedding.filter((value): value is number => typeof value === 'number')
}
