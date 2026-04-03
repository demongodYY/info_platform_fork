import { describe, expect, it } from 'vitest'
import { buildFallbackSearchAnswer } from './llm'

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
