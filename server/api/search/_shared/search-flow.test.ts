import { describe, expect, it, vi } from 'vitest'
import { runSearchFlow } from './search-flow'
import type { SourceRegistryEntry } from '~/types/search'

const registry: SourceRegistryEntry[] = []

describe('runSearchFlow', () => {
  const analysis = {
    subject: 'Pompe disease',
    aliases: ['Pompe disease'],
    intent: 'treatment_update' as const,
    timeSensitivity: 'medium' as const,
    preferredSourceTypes: ['treatment_update' as const, 'clinical_trial' as const],
    deprioritizedSourceTypes: ['disease_reference' as const],
    queryTerms: ['Pompe disease', 'treatment'],
  }

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
        searchKnowledgeBase: vi.fn().mockResolvedValue([]),
      },
      registry,
      analyzeQuery: vi.fn().mockResolvedValue(analysis),
      detectSafetyRisk: vi.fn().mockResolvedValue({ risky: false }),
      generateAnswer: vi.fn().mockResolvedValue({
        content: 'ok',
        messageStatus: 'completed' as const,
      }),
    })

    expect(result.sources).toHaveLength(10)
  })

  it('adds knowledge base evidence to the local search stage and still records live search stages', async () => {
    const searchKnowledgeBase = vi.fn().mockResolvedValue([
      {
        title: 'FSHD 麻醉注意事项 - 第 2 页',
        content: 'FSHD 患者手术麻醉前应与神经肌肉专科和麻醉科充分沟通。',
        snippet: '手术麻醉前应与神经肌肉专科和麻醉科充分沟通。',
        sourceUrl: 'https://storage.example.com/fshd-anesthesia.pdf',
        sourceDomain: 'storage.example.com',
        sourceLabel: '站内内容 · 02.临床管理与治疗 · B',
        sourceType: 'reference' as const,
        sourceTier: 'authority' as const,
        publishedAt: null,
      },
    ])

    const result = await runSearchFlow({
      query: 'FSHD 麻醉注意事项',
      repositories: {
        searchNotes: vi.fn().mockResolvedValue([]),
        searchCache: vi.fn().mockResolvedValue([]),
        searchKnowledgeBase,
      },
      registry,
      analyzeQuery: vi.fn().mockResolvedValue(analysis),
      detectSafetyRisk: vi.fn().mockResolvedValue({ risky: false }),
      generateAnswer: vi.fn().mockResolvedValue({
        content: 'ok',
        messageStatus: 'completed' as const,
      }),
    })

    expect(searchKnowledgeBase).toHaveBeenCalledWith('FSHD 麻醉注意事项', analysis)
    expect(result.sources).toHaveLength(1)
    expect(result.sources[0]?.sourceLabel).toContain('站内内容')
    expect(result.searchTrace).toContainEqual({
      key: 'local-notes',
      label: '站内知识库检索',
      status: 'success',
      detail: '命中 1 条结果',
    })
    expect(result.searchTrace.map(entry => entry.key)).toContain('authority-search')
    expect(result.searchTrace.map(entry => entry.key)).toContain('internet-search')
  })

  it('records knowledge base errors without blocking answer generation', async () => {
    const result = await runSearchFlow({
      query: 'FSHD 麻醉注意事项',
      repositories: {
        searchNotes: vi.fn().mockResolvedValue([]),
        searchCache: vi.fn().mockResolvedValue([]),
        searchKnowledgeBase: vi.fn().mockRejectedValue(new Error('KB RPC failed')),
      },
      registry,
      analyzeQuery: vi.fn().mockResolvedValue(analysis),
      detectSafetyRisk: vi.fn().mockResolvedValue({ risky: false }),
      generateAnswer: vi.fn().mockResolvedValue({
        content: 'fallback ok',
        messageStatus: 'completed' as const,
      }),
    })

    expect(result.answer).toBe('fallback ok')
    expect(result.searchTrace).toContainEqual({
      key: 'local-notes',
      label: '站内知识库检索',
      status: 'error',
      detail: 'KB RPC failed',
    })
  })
})
