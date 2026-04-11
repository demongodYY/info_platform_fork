import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchWhitelistedSources } from './live-search'
import type { SourceRegistryEntry } from '~/types/search'

const registry: SourceRegistryEntry[] = [
  {
    id: 'nord',
    name: 'NORD',
    domain: 'rarediseases.org',
    sourceType: 'reference',
    region: 'global',
    language: 'en',
    priority: 1,
    enabled: true,
    notes: null,
  },
]

describe('searchWhitelistedSources', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.SERPAPI_KEY
    delete process.env.BRAVE_API_KEY
  })

  it('maps Brave API web results into authority evidence items', async () => {
    process.env.BRAVE_API_KEY = 'test-key'

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: 'Working result',
                url: 'https://rarediseases.org/working-result',
                description: 'Useful summary',
              },
            ],
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    )

    vi.stubGlobal('fetch', fetchMock)

    const results = await searchWhitelistedSources('Pompe disease treatment', registry)

    expect(results).toHaveLength(1)
    expect(results[0]?.title).toBe('Working result')
    expect(results[0]?.sourceDomain).toBe('rarediseases.org')
    expect(results[0]?.snippet).toBe('Useful summary')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://api.search.brave.com/res/v1/web/search?'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          'X-Subscription-Token': 'test-key',
        }),
      })
    )
  })
})
