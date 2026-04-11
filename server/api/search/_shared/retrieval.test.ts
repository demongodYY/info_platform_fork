import { describe, expect, it, vi } from 'vitest'
import { retrieveSearchEvidence } from './retrieval'

describe('retrieveSearchEvidence', () => {
  it('keeps all live evidence instead of truncating to eight items', async () => {
    const evidence = Array.from({ length: 10 }, (_, index) => ({
      sourceType: 'reference' as const,
      sourceTier: 'authority' as const,
      sourceLabel: `Source ${index + 1}`,
      sourceUrl: `https://example.com/${index + 1}`,
      sourceDomain: 'example.com',
      snippet: `Snippet ${index + 1}`,
      publishedAt: null,
      title: `Title ${index + 1}`,
      content: `Content ${index + 1}`,
    }))

    const result = await retrieveSearchEvidence(
      {
        searchNotes: vi.fn().mockResolvedValue([]),
        searchCache: vi.fn().mockResolvedValue([]),
      },
      'Pompe disease treatment',
      {
        fetchLiveSearchResults: vi.fn().mockResolvedValue({
          evidence,
          searchTrace: [],
        }),
      }
    )

    expect(result.evidence).toHaveLength(10)
  })
})
