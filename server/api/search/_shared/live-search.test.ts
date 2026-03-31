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
  })

  it('keeps successful SerpApi results when one variant is rate limited', async () => {
    process.env.SERPAPI_KEY = 'test-key'

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            organic_results: [
              {
                title: 'Working result',
                link: 'https://rarediseases.org/working-result',
                snippet: 'Useful summary',
              },
            ],
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'rate limited' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
      .mockResolvedValue(
        new Response(JSON.stringify({ organic_results: [] }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )

    vi.stubGlobal('fetch', fetchMock)

    const results = await searchWhitelistedSources('Pompe disease treatment', registry)

    expect(results).toHaveLength(1)
    expect(results[0]?.title).toBe('Working result')
    expect(results[0]?.sourceDomain).toBe('rarediseases.org')
  })
})
