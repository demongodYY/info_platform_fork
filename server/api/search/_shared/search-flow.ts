import type {
  SearchMessageStatus,
  SearchQueryAnalysis,
  SearchResponse,
  SearchTraceEntry,
} from '~/types/search'
import { normalizeSearchQuery } from './query-normalization'
import { searchInternetSupplementSources, searchWhitelistedSources } from './live-search'
import type { SearchRepositories } from './repositories'
import type { SourceRegistryEntry } from '~/types/search'
import type { RetrievedEvidenceItem } from './retrieval'

interface SearchFlowDeps {
  query: string
  repositories: Pick<SearchRepositories, 'searchNotes' | 'searchCache' | 'searchKnowledgeBase'>
  registry: SourceRegistryEntry[]
  analyzeQuery: (query: string) => Promise<SearchQueryAnalysis>
  detectSafetyRisk: (query: string) => Promise<{ risky: boolean; response?: string }>
  generateAnswer: (input: { query: string; evidence: RetrievedEvidenceItem[] }) => Promise<{
    content: string
    messageStatus: SearchMessageStatus
  }>
  onTrace?: (trace: SearchTraceEntry[]) => Promise<void> | void
}

export async function runSearchFlow({
  query,
  repositories,
  registry,
  analyzeQuery,
  detectSafetyRisk,
  generateAnswer,
  onTrace,
}: SearchFlowDeps): Promise<SearchResponse> {
  const safety = await detectSafetyRisk(query)
  if (safety.risky) {
    return {
      query,
      answer: safety.response || '请立刻寻求线下帮助。',
      messageStatus: 'safety_routed',
      sources: [],
      searchTrace: [],
    }
  }

  const normalized = normalizeSearchQuery(query)
  const analysis = await analyzeQuery(query)
  const searchTrace: SearchTraceEntry[] = []
  const knowledgeQuery = normalized.effectiveQuery || query
  const [notesResult, cacheResult, knowledgeResult] = await Promise.allSettled([
    repositories.searchNotes(normalized.localQuery),
    repositories.searchCache(normalized.localQuery),
    repositories.searchKnowledgeBase(knowledgeQuery, analysis),
  ])

  const notes = notesResult.status === 'fulfilled' ? notesResult.value : []
  const cache = cacheResult.status === 'fulfilled' ? cacheResult.value : []
  const knowledge = knowledgeResult.status === 'fulfilled' ? knowledgeResult.value : []
  const localEvidence: RetrievedEvidenceItem[] = [
    ...knowledge,
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

  searchTrace.push(
    buildLocalTrace(
      notesResult,
      cacheResult,
      knowledgeResult,
      notes.length,
      cache.length,
      knowledge.length
    )
  )
  await onTrace?.([...searchTrace])

  let authorityEvidence: RetrievedEvidenceItem[] = []
  let supplementEvidence: RetrievedEvidenceItem[] = []

  try {
    authorityEvidence = await searchWhitelistedSources(
      normalized.effectiveQuery || query,
      registry,
      analysis
    )
    searchTrace.push({
      key: 'authority-search',
      label: '权威来源搜索',
      status: authorityEvidence.length > 0 ? 'success' : 'empty',
      detail:
        authorityEvidence.length > 0
          ? `命中 ${authorityEvidence.length} 条结果`
          : '未命中可引用权威结果',
    })
  } catch (error: unknown) {
    searchTrace.push({
      key: 'authority-search',
      label: '权威来源搜索',
      status: 'error',
      detail: getErrorMessage(error),
    })
  }
  await onTrace?.([...searchTrace])

  try {
    supplementEvidence = await searchInternetSupplementSources(
      normalized.effectiveQuery || query,
      registry
    )
    searchTrace.push({
      key: 'internet-search',
      label: '互联网补充搜索',
      status: supplementEvidence.length > 0 ? 'success' : 'empty',
      detail:
        supplementEvidence.length > 0
          ? `命中 ${supplementEvidence.length} 条结果`
          : '未命中补充网页结果',
    })
  } catch (error: unknown) {
    searchTrace.push({
      key: 'internet-search',
      label: '互联网补充搜索',
      status: 'error',
      detail: getErrorMessage(error),
    })
  }
  await onTrace?.([...searchTrace])

  const evidence = [...localEvidence, ...authorityEvidence, ...supplementEvidence]
  const answer = await generateAnswer({
    query,
    evidence,
  })

  return {
    query,
    answer: answer.content,
    messageStatus: answer.messageStatus,
    sources: evidence.map((item, index) => ({
      title: item.title,
      sourceType: item.sourceType,
      sourceTier: item.sourceTier || 'authority',
      sourceLabel: item.sourceLabel,
      sourceUrl: item.sourceUrl,
      sourceDomain: item.sourceDomain,
      snippet: item.snippet,
      publishedAt: item.publishedAt,
      rank: index + 1,
    })),
    searchTrace,
  }
}

function buildLocalTrace(
  notesResult: PromiseSettledResult<Array<unknown>>,
  cacheResult: PromiseSettledResult<Array<unknown>>,
  knowledgeResult: PromiseSettledResult<Array<unknown>>,
  notesLength: number,
  cacheLength: number,
  knowledgeLength: number
): SearchTraceEntry {
  if (
    notesResult.status === 'rejected' ||
    cacheResult.status === 'rejected' ||
    knowledgeResult.status === 'rejected'
  ) {
    return {
      key: 'local-notes',
      label: '站内知识库检索',
      status: 'error',
      detail: [notesResult, cacheResult, knowledgeResult]
        .filter(result => result.status === 'rejected')
        .map(result => getErrorMessage((result as PromiseRejectedResult).reason))
        .join(' | '),
    }
  }

  return {
    key: 'local-notes',
    label: '站内知识库检索',
    status: notesLength + cacheLength + knowledgeLength > 0 ? 'success' : 'empty',
    detail:
      notesLength + cacheLength + knowledgeLength > 0
        ? `命中 ${notesLength + cacheLength + knowledgeLength} 条结果`
        : '未命中知识库结果',
  }
}

function extractDomain(value: string) {
  try {
    return new URL(value).hostname
  } catch {
    return value
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '搜索失败'
}
