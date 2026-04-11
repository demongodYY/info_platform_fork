import { describe, expect, it, vi } from 'vitest'
import { runSearchFlow } from './search-flow'
import type { SourceRegistryEntry } from '~/types/search'

const registry: SourceRegistryEntry[] = []

describe('runSearchFlow', () => {
  it('returns all gathered sources instead of truncating combined evidence to eight items', async () => {
    const localCache = Array.from({ length: 5 }, (_, index) => ({
      id: `${index + 1}`,
      queryHash: 'hash',
      queryText: 'Pompe disease treatment',
      sourceUrl: `https://cache.example.com/${index + 1}`,
      sourceDomain: 'cache.example.com',
      sourceType: 'reference' as const,
      title: `Cache ${index + 1}`,
      snippet: `Cache snippet ${index + 1}`,
      content: `Cache content ${index + 1}`,
      publishedAt: null,
      fetchedAt: '2026-04-11T00:00:00Z',
      expiresAt: '2026-04-12T00:00:00Z',
    }))

    const notes = Array.from({ length: 5 }, (_, index) => ({
      id: `${index + 1}`,
      title: `Note ${index + 1}`,
      content: `Note content ${index + 1}`.repeat(20),
      source: `https://note.example.com/${index + 1}`,
      publishedAt: null,
    }))

    const result = await runSearchFlow({
      query: 'Pompe disease treatment',
      repositories: {
        searchNotes: vi.fn().mockResolvedValue(notes),
        searchCache: vi.fn().mockResolvedValue(localCache),
      },
      registry,
      analyzeQuery: vi.fn().mockResolvedValue({
        subject: 'Pompe disease',
        aliases: ['Pompe disease'],
        intent: 'treatment_update',
        timeSensitivity: 'medium',
        preferredSourceTypes: ['treatment_update', 'clinical_trial'],
        deprioritizedSourceTypes: ['disease_reference'],
        queryTerms: ['Pompe disease', 'treatment'],
      }),
      detectSafetyRisk: vi.fn().mockResolvedValue({ risky: false }),
      generateAnswer: vi.fn().mockResolvedValue({
        content: 'ok',
        messageStatus: 'completed' as const,
      }),
    })

    expect(result.sources).toHaveLength(10)
  })
})
