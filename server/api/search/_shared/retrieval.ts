import type { SearchRepositories } from './repositories'
import type { SearchSource, SearchTraceEntry } from '~/types/search'

export interface RetrievedEvidenceItem extends Omit<SearchSource, 'rank'> {
  content: string
}

export interface RetrievalResult {
  evidence: RetrievedEvidenceItem[]
  usedFallback: boolean
  searchTrace: SearchTraceEntry[]
}

export async function retrieveSearchEvidence(
  repositories: Pick<SearchRepositories, 'searchNotes' | 'searchCache'>,
  query: string,
  options?: {
    fetchLiveSearchResults?: (query: string) => Promise<
      | RetrievedEvidenceItem[]
      | {
          evidence: RetrievedEvidenceItem[]
          searchTrace: SearchTraceEntry[]
        }
    >
  }
): Promise<RetrievalResult> {
  const searchTrace: SearchTraceEntry[] = []
  const [notesResult, cacheResult] = await Promise.allSettled([
    repositories.searchNotes(query),
    repositories.searchCache(query),
  ])
  const notes = notesResult.status === 'fulfilled' ? notesResult.value : []
  const cache = cacheResult.status === 'fulfilled' ? cacheResult.value : []

  if (notesResult.status === 'rejected' || cacheResult.status === 'rejected') {
    searchTrace.push({
      key: 'local-notes',
      label: '站内知识库检索',
      status: 'error',
      detail: [notesResult, cacheResult]
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason?.message || '本地检索失败')
        .join(' | '),
    })
  }

  const localEvidence: RetrievedEvidenceItem[] = [
    ...cache.map(entry => ({
      sourceType: entry.sourceType,
      sourceTier: 'authority' as const,
      sourceLabel: entry.sourceDomain,
      sourceUrl: entry.sourceUrl,
      sourceDomain: entry.sourceDomain,
      snippet: entry.snippet,
      publishedAt: entry.publishedAt,
      title: entry.title,
      content: entry.content,
    })),
    ...notes.map(note => ({
      sourceType: 'reference' as const,
      sourceTier: 'authority' as const,
      sourceLabel: note.source,
      sourceUrl: note.source,
      sourceDomain: extractDomain(note.source),
      snippet: note.content.slice(0, 240),
      publishedAt: note.publishedAt,
      title: note.title,
      content: note.content,
    })),
  ]

  if (localEvidence.length > 0) {
    return {
      evidence: localEvidence,
      usedFallback: false,
      searchTrace: searchTrace.length
        ? searchTrace
        : [
            {
              key: 'local-notes',
              label: '站内知识库检索',
              status: 'success',
              detail: `命中 ${notes.length + cache.length} 条结果`,
            },
          ],
    }
  }

  const liveResultRaw = options?.fetchLiveSearchResults
    ? await options.fetchLiveSearchResults(query)
    : {
        evidence: [],
        searchTrace: [],
      }
  const liveResult = Array.isArray(liveResultRaw)
    ? {
        evidence: liveResultRaw,
        searchTrace: [],
      }
    : liveResultRaw
  const liveEvidence = liveResult.evidence

  return {
    evidence: liveEvidence,
    usedFallback: liveEvidence.length > 0,
    searchTrace: [
      ...(searchTrace.length
        ? searchTrace
        : [
            {
              key: 'local-notes',
              label: '站内知识库检索',
              status: 'empty' as const,
              detail: '未命中知识库结果',
            },
          ]),
      ...liveResult.searchTrace,
    ],
  }
}

function extractDomain(value: string) {
  try {
    return new URL(value).hostname
  } catch {
    return value
  }
}
