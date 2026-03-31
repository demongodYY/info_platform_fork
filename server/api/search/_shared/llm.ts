import { createError } from 'h3'
import type { SearchMessageStatus } from '~/types/search'
import type { RetrievedEvidenceItem } from './retrieval'
import { buildStructuredFallbackAnswer } from './fallback-answer'

export interface GeneratedAnswer {
  content: string
  messageStatus: SearchMessageStatus
}

export async function generateSearchAnswer(prompt: string): Promise<GeneratedAnswer> {
  const apiKey = process.env.OPENAI_API_KEY
  const apiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1'
  const model = process.env.MODEL_NAME || 'gpt-4o-mini'

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing OPENAI_API_KEY for search generation',
    })
  }

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Search model request failed',
    })
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
  }

  return {
    content: data.choices?.[0]?.message?.content?.trim() || '暂时没有生成可用回复。',
    messageStatus: 'completed',
  }
}

export function buildFallbackSearchAnswer(input: {
  query: string
  evidence: RetrievedEvidenceItem[]
}): GeneratedAnswer {
  return {
    content: buildStructuredFallbackAnswer(input),
    messageStatus: 'failed',
  }
}
