import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchWhitelistedSources } from './live-search'
import type { SearchQueryAnalysis, SourceRegistryEntry } from '~/types/search'

const registry: SourceRegistryEntry[] = [
  {
    id: 'nord',
    name: 'NORD',
    domain: 'rarediseases.org',
    url: 'https://rarediseases.org/',
    sourceType: 'reference',
    sourceTypes: ['disease_reference'],
    region: 'global',
    language: 'en',
    priority: 1,
    enabled: true,
    notes: null,
  },
]

describe('searchWhitelistedSources', () => {
  const treatmentUpdateAnalysis: SearchQueryAnalysis = {
    subject: 'FSHD',
    aliases: ['FSHD'],
    intent: 'treatment_update',
    timeSensitivity: 'high',
    preferredSourceTypes: ['treatment_update', 'clinical_trial', 'drug_approval', 'patient_org'],
    deprioritizedSourceTypes: ['disease_reference'],
    queryTerms: ['FSHD', 'treatment', 'update'],
  }
  const pompeTreatmentAnalysis: SearchQueryAnalysis = {
    subject: 'Pompe disease',
    aliases: ['Pompe disease'],
    intent: 'treatment_update',
    timeSensitivity: 'high',
    preferredSourceTypes: ['treatment_update', 'clinical_trial', 'drug_approval', 'patient_org'],
    deprioritizedSourceTypes: ['disease_reference'],
    queryTerms: ['Pompe disease', 'treatment', 'update'],
  }

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

  it('includes clinical sources for treatment queries instead of only early drug sites', async () => {
    process.env.BRAVE_API_KEY = 'test-key'

    const mixedRegistry: SourceRegistryEntry[] = [
      ...Array.from(
        { length: 8 },
        (_, index): SourceRegistryEntry => ({
          id: `drug-${index + 1}`,
          name: `Drug ${index + 1}`,
          domain: `drug${index + 1}.example.com`,
          url: `https://drug${index + 1}.example.com/`,
          sourceType: 'drug_approval',
          sourceTypes: ['drug_approval'],
          region: 'global',
          language: 'en',
          priority: index + 1,
          enabled: true,
          notes: null,
        })
      ),
      {
        id: 'reference-1',
        name: 'Reference Source',
        domain: 'reference.example.com',
        url: 'https://reference.example.com/',
        sourceType: 'reference',
        sourceTypes: ['disease_reference'],
        region: 'global',
        language: 'en',
        priority: 9,
        enabled: true,
        notes: null,
      },
      {
        id: 'clinical-1',
        name: 'Clinical Source',
        domain: 'clinical.example.com',
        url: 'https://clinical.example.com/',
        sourceType: 'clinical_trial',
        sourceTypes: ['clinical_trial', 'treatment_update'],
        region: 'global',
        language: 'en',
        priority: 10,
        enabled: true,
        notes: null,
      },
    ]

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const query = new URL(url).searchParams.get('q') || ''
      const domain = query.match(/site:([^\s]+)/)?.[1] || 'unknown.example.com'
      const subject = query.includes('Pompe disease') ? 'Pompe disease' : 'FSHD'

      return new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: `${subject} treatment update for ${domain}`,
                url: `https://${domain}/result`,
                description: `Latest ${subject} treatment update from ${domain}`,
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
    })

    vi.stubGlobal('fetch', fetchMock)

    const results = await searchWhitelistedSources(
      'Pompe disease treatment progress',
      mixedRegistry,
      pompeTreatmentAnalysis
    )

    expect(results.some(item => item.sourceDomain === 'clinical.example.com')).toBe(true)
    expect(results.some(item => item.sourceDomain === 'drug1.example.com')).toBe(true)
    expect(results.some(item => item.sourceDomain === 'reference.example.com')).toBe(false)
  })

  it('deprioritizes registry-like authority pages for treatment-update searches', async () => {
    process.env.BRAVE_API_KEY = 'test-key'

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: 'Orphanet: Deutsches FSHD-Patientenregister',
                url: 'https://orpha.net/en/research-trials/registry/123',
                description: 'Further information on this patient registry',
              },
              {
                title: 'FSHD treatment update 2026',
                url: 'https://orpha.net/en/news/fshd-treatment-update',
                description: 'Latest treatment update for FSHD',
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

    const results = await searchWhitelistedSources(
      'FSHD最新治疗进展',
      [
        {
          id: 'orpha',
          name: 'Orphanet',
          domain: 'orpha.net',
          url: 'https://orpha.net/en/',
          sourceType: 'reference',
          sourceTypes: ['disease_reference', 'treatment_update'],
          region: 'global',
          language: 'en',
          priority: 1,
          enabled: true,
          notes: null,
        },
      ],
      treatmentUpdateAnalysis
    )

    expect(results[0]?.sourceUrl).toBe('https://orpha.net/en/news/fshd-treatment-update')
  })

  it('prioritizes disease-specific authority sources ahead of generic update sites', async () => {
    process.env.BRAVE_API_KEY = 'test-key'

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const query = new URL(url).searchParams.get('q') || ''
      const domain = query.match(/site:([^\s]+)/)?.[1] || 'unknown.example.com'

      return new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title:
                  domain === 'fshdsociety.org'
                    ? 'Facioscapulohumeral muscular dystrophy treatment update 2026'
                    : `FSHD treatment update on ${domain}`,
                url: `https://${domain}/fshd-treatment-update`,
                description:
                  domain === 'fshdsociety.org'
                    ? 'Latest facioscapulohumeral muscular dystrophy clinical update'
                    : `Latest FSHD treatment update on ${domain}`,
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
    })

    vi.stubGlobal('fetch', fetchMock)

    const results = await searchWhitelistedSources(
      'FSHD最新治疗进展',
      [
        {
          id: 'orpha',
          name: 'OrphaNet',
          domain: 'orpha.net',
          url: 'https://www.orpha.net/',
          sourceType: 'reference',
          sourceTypes: ['treatment_update', 'disease_reference'],
          region: 'global',
          language: 'en',
          priority: 1,
          enabled: true,
          notes: 'rare disease updates',
        },
        {
          id: 'ddw',
          name: 'DDW-Online',
          domain: 'ddw-online.com',
          url: 'https://www.ddw-online.com/',
          sourceType: 'news',
          sourceTypes: ['treatment_update'],
          region: 'global',
          language: 'en',
          priority: 2,
          enabled: true,
          notes: 'rare disease industry news',
        },
        {
          id: 'biobuzz',
          name: 'BioBuzz',
          domain: 'news.biobuzz.io',
          url: 'https://news.biobuzz.io/',
          sourceType: 'news',
          sourceTypes: ['treatment_update'],
          region: 'global',
          language: 'en',
          priority: 3,
          enabled: true,
          notes: 'biotech program progress',
        },
        {
          id: 'fshd-society',
          name: 'FSHD Society',
          domain: 'fshdsociety.org',
          url: 'https://www.fshdsociety.org/',
          sourceType: 'news',
          sourceTypes: ['treatment_update'],
          region: 'global',
          language: 'en',
          priority: 20,
          enabled: true,
          notes: 'FSHD news and clinical program updates',
        },
      ],
      treatmentUpdateAnalysis
    )

    expect(fetchMock.mock.calls.some(([url]) => url.includes('site%3Afshdsociety.org'))).toBe(true)
    expect(results.some(item => item.sourceDomain === 'fshdsociety.org')).toBe(true)
  })

  it('keeps authority results within a configured source path when the registry entry points to a subdirectory', async () => {
    process.env.BRAVE_API_KEY = 'test-key'

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: 'General NORD page',
                url: 'https://rarediseases.org/rare-diseases/facioscapulohumeral-muscular-dystrophy/',
                description: 'Broad disease overview',
              },
              {
                title: 'Help now FSHD support',
                url: 'https://rarediseases.org/patients/help-now/fshd-support/',
                description: 'Program update',
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

    const results = await searchWhitelistedSources(
      'FSHD support update',
      [
        {
          id: 'nord-help',
          name: 'NORD Help Now',
          domain: 'rarediseases.org',
          url: 'https://rarediseases.org/patients/help-now/',
          sourceType: 'patient_support',
          sourceTypes: ['patient_org'] as const,
          region: 'global',
          language: 'en',
          priority: 1,
          enabled: true,
          notes: null,
        },
      ],
      {
        subject: 'FSHD',
        aliases: ['FSHD'],
        intent: 'patient_support',
        timeSensitivity: 'medium',
        preferredSourceTypes: ['patient_org'],
        deprioritizedSourceTypes: [],
        queryTerms: ['FSHD', 'support'],
      }
    )

    expect(results).toHaveLength(1)
    expect(results[0]?.sourceUrl).toContain('/patients/help-now/')
  })

  it('filters out authority pages that do not mention the subject for treatment-update queries', async () => {
    process.env.BRAVE_API_KEY = 'test-key'

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: 'Orphanet',
                url: 'https://www.orpha.net/',
                description: 'Inventory and encyclopaedia of rare diseases',
              },
              {
                title: 'Orphanet: BAXALTA US, INC.',
                url: 'https://www.orpha.net/en/institutions/legal-entity/440990',
                description: 'Search for a Legal Entity',
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

    const results = await searchWhitelistedSources(
      'FSHD最新治疗进展',
      [
        {
          id: 'orpha',
          name: 'Orphanet',
          domain: 'orpha.net',
          url: 'https://www.orpha.net/',
          sourceType: 'reference',
          sourceTypes: ['disease_reference', 'treatment_update'],
          region: 'global',
          language: 'en',
          priority: 1,
          enabled: true,
          notes: null,
        },
      ],
      treatmentUpdateAnalysis
    )

    expect(results).toHaveLength(0)
  })

  it('filters out generic authority entries even when they mention the subject', async () => {
    process.env.BRAVE_API_KEY = 'test-key'

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: 'FSHD1; FACIOSCAPULOHUMERAL MUSCULAR DYSTROPHY 1',
                url: 'https://omim.org/entry/158900',
                description: 'Clinical synopsis and gene-phenotype overview for FSHD',
              },
              {
                title: 'FSHD treatment update 2026',
                url: 'https://omim.org/news/fshd-treatment-update-2026',
                description: 'Latest FSHD clinical and treatment progress update',
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

    const results = await searchWhitelistedSources(
      'FSHD最新治疗进展',
      [
        {
          id: 'omim',
          name: 'OMIM',
          domain: 'omim.org',
          url: 'https://omim.org/',
          sourceType: 'reference',
          sourceTypes: ['disease_reference', 'treatment_update'],
          region: 'global',
          language: 'en',
          priority: 1,
          enabled: true,
          notes: null,
        },
      ],
      treatmentUpdateAnalysis
    )

    expect(results).toHaveLength(1)
    expect(results[0]?.sourceUrl).toBe('https://omim.org/news/fshd-treatment-update-2026')
  })

  it('does not backfill unrelated authority buckets for treatment-update queries', async () => {
    process.env.BRAVE_API_KEY = 'test-key'

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const query = new URL(url).searchParams.get('q') || ''
      const domain = query.match(/site:([^\s]+)/)?.[1] || 'unknown.example.com'

      return new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: `FSHD result for ${domain}`,
                url: `https://${domain}/fshd-update`,
                description: `Latest FSHD treatment update on ${domain}`,
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
    })

    vi.stubGlobal('fetch', fetchMock)

    const results = await searchWhitelistedSources(
      'FSHD最新治疗进展',
      [
        {
          id: 'update-1',
          name: 'Update Source',
          domain: 'updates.example.com',
          url: 'https://updates.example.com/',
          sourceType: 'news',
          sourceTypes: ['treatment_update'],
          region: 'global',
          language: 'en',
          priority: 1,
          enabled: true,
          notes: null,
        },
        {
          id: 'omim',
          name: 'OMIM',
          domain: 'omim.org',
          url: 'https://omim.org/',
          sourceType: 'reference',
          sourceTypes: ['disease_reference'],
          region: 'global',
          language: 'en',
          priority: 2,
          enabled: true,
          notes: null,
        },
      ],
      treatmentUpdateAnalysis
    )

    expect(results).toHaveLength(1)
    expect(results[0]?.sourceDomain).toBe('updates.example.com')
  })

  it('searches multiple paths from the same domain when they are distinct authority entries', async () => {
    process.env.BRAVE_API_KEY = 'test-key'

    const fetchMock = vi.fn().mockImplementation(async () => {
      if (fetchMock.mock.calls.length === 1) {
        return new Response(
          JSON.stringify({
            web: {
              results: [
                {
                  title: 'FSHD support update',
                  url: 'https://rarediseases.org/patients/help-now/fshd-support-update',
                  description: 'Latest FSHD support update',
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
      }

      return new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: 'FSHD organization page',
                url: 'https://rarediseases.org/organizations/fshd',
                description: 'FSHD community organization',
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
    })

    vi.stubGlobal('fetch', fetchMock)

    const results = await searchWhitelistedSources(
      'FSHD support update',
      [
        {
          id: 'nord-help',
          name: 'NORD Help Now',
          domain: 'rarediseases.org',
          url: 'https://rarediseases.org/patients/help-now/',
          sourceType: 'patient_support',
          sourceTypes: ['patient_org'],
          region: 'global',
          language: 'en',
          priority: 1,
          enabled: true,
          notes: null,
        },
        {
          id: 'nord-org',
          name: 'NORD Organizations',
          domain: 'rarediseases.org',
          url: 'https://rarediseases.org/organizations',
          sourceType: 'patient_support',
          sourceTypes: ['patient_org'],
          region: 'global',
          language: 'en',
          priority: 2,
          enabled: true,
          notes: null,
        },
      ],
      {
        subject: 'FSHD',
        aliases: ['FSHD'],
        intent: 'patient_support',
        timeSensitivity: 'medium',
        preferredSourceTypes: ['patient_org'],
        deprioritizedSourceTypes: [],
        queryTerms: ['FSHD', 'support'],
      }
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(results.map(item => item.sourceUrl)).toEqual(
      expect.arrayContaining([
        'https://rarediseases.org/patients/help-now/fshd-support-update',
        'https://rarediseases.org/organizations/fshd',
      ])
    )
  })
})
