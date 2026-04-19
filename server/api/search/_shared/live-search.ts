import type { SearchQueryAnalysis, SourceRegistryEntry } from '~/types/search'
import type { RetrievedEvidenceItem } from './retrieval'

export async function searchWhitelistedSources(
  query: string,
  registry: SourceRegistryEntry[],
  analysis?: SearchQueryAnalysis
): Promise<RetrievedEvidenceItem[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []

  const braveApiKey = process.env.BRAVE_API_KEY
  if (!braveApiKey) return []

  const prioritizedSources = selectSourcesForQuery(registry, analysis)
  const results = await Promise.allSettled(
    prioritizedSources.map(source => searchWithBrave(trimmedQuery, source, braveApiKey, analysis))
  )

  return dedupeEvidenceItems(flattenSettledResults(results))
}

export async function searchInternetSupplementSources(
  query: string,
  registry: SourceRegistryEntry[]
): Promise<RetrievedEvidenceItem[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []

  const blockedDomains = new Set(registry.map(source => source.domain))
  const braveApiKey = process.env.BRAVE_API_KEY

  if (braveApiKey) {
    return searchInternetWithBrave(trimmedQuery, blockedDomains, braveApiKey)
  }

  return []
}

async function searchWithBrave(
  query: string,
  source: SourceRegistryEntry,
  braveApiKey: string,
  analysis?: SearchQueryAnalysis
): Promise<RetrievedEvidenceItem[]> {
  const searchQuery = new URLSearchParams({
    q: buildAuthorityQuery(source, query, analysis),
    count: '5',
  })

  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${searchQuery.toString()}`,
    {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': braveApiKey,
      },
    }
  )

  if (!response.ok) {
    throw await createSearchError('Brave', response)
  }

  const payload = (await response.json()) as BraveSearchResponse
  return parseBraveResults(payload, source, analysis)
}

async function searchInternetWithBrave(
  query: string,
  blockedDomains: Set<string>,
  braveApiKey: string
): Promise<RetrievedEvidenceItem[]> {
  const searchQuery = new URLSearchParams({
    q: query,
    count: '6',
  })

  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${searchQuery.toString()}`,
    {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': braveApiKey,
      },
    }
  )

  if (!response.ok) {
    throw await createSearchError('Brave', response)
  }

  const payload = (await response.json()) as BraveSearchResponse
  return parseInternetBraveResults(payload, blockedDomains)
}

interface BraveSearchResponse {
  web?: {
    results?: Array<{
      title?: string
      url?: string
      description?: string
    }>
  }
  news?: {
    results?: Array<{
      title?: string
      url?: string
      description?: string
    }>
  }
}

function parseBraveResults(
  payload: BraveSearchResponse,
  source: Pick<SourceRegistryEntry, 'name' | 'domain' | 'sourceType' | 'url'>,
  analysis?: SearchQueryAnalysis
): RetrievedEvidenceItem[] {
  const items: RetrievedEvidenceItem[] = []
  const rankedResults = [...(payload.web?.results || []), ...(payload.news?.results || [])].sort(
    (a, b) => scoreResultForAnalysis(b, analysis) - scoreResultForAnalysis(a, analysis)
  )
  for (const result of rankedResults) {
    const url = result.url || ''
    if (!isMatchingSourceUrl(url, source)) continue
    if (!isRelevantAuthorityResult(result, analysis)) continue

    items.push({
      sourceType: source.sourceType,
      sourceTier: 'authority',
      sourceLabel: source.name,
      sourceUrl: url,
      sourceDomain: source.domain,
      snippet: (result.description || '').trim(),
      publishedAt: null,
      title: (result.title || '').trim(),
      content: (result.description || '').trim(),
    })
  }

  return items.slice(0, maxResultsPerSource(analysis))
}

function parseInternetBraveResults(
  payload: BraveSearchResponse,
  blockedDomains: Set<string>
): RetrievedEvidenceItem[] {
  const items: RetrievedEvidenceItem[] = []
  for (const result of payload.web?.results || []) {
    const url = result.url || ''
    const domain = extractDomain(url)
    if (!url || !domain || isBlockedDomain(domain, blockedDomains)) continue

    items.push({
      sourceType: 'news',
      sourceTier: 'internet_supplement',
      sourceLabel: prettifyDomain(domain),
      sourceUrl: url,
      sourceDomain: domain,
      snippet: (result.description || '').trim(),
      publishedAt: null,
      title: (result.title || domain).trim(),
      content: (result.description || '').trim(),
    })
  }

  return items
}

function dedupeEvidenceItems(items: RetrievedEvidenceItem[]) {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = `${item.sourceUrl}::${item.title}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function flattenSettledResults(results: PromiseSettledResult<RetrievedEvidenceItem[]>[]) {
  return results.flatMap(result => (result.status === 'fulfilled' ? result.value : []))
}

function selectSourcesForQuery(registry: SourceRegistryEntry[], analysis?: SearchQueryAnalysis) {
  const buckets = buildSourceBuckets(analysis)
  const selected = new Map<string, SourceRegistryEntry>()

  for (const bucket of buckets) {
    for (const source of sortSourcesForAnalysis(
      registry.filter(entry => entry.sourceTypes.some(type => bucket.sourceTypes.includes(type))),
      analysis
    )) {
      const sourceKey = buildSourceSelectionKey(source)
      if (selected.has(sourceKey)) continue
      selected.set(sourceKey, source)
      if (
        [...selected.values()].filter(entry =>
          entry.sourceTypes.some(type => bucket.sourceTypes.includes(type))
        ).length >= bucket.limit
      ) {
        break
      }
    }
  }

  const allowsBackfill = !analysis || analysis.intent === 'disease_overview'
  if (allowsBackfill) {
    for (const source of [...registry].sort((a, b) => a.priority - b.priority)) {
      const sourceKey = buildSourceSelectionKey(source)
      if (selected.has(sourceKey)) continue
      selected.set(sourceKey, source)
      if (selected.size >= 10) break
    }
  }

  return [...selected.values()]
}

function sortSourcesForAnalysis(registry: SourceRegistryEntry[], analysis?: SearchQueryAnalysis) {
  return [...registry].sort(
    (a, b) =>
      scoreSourceForAnalysis(b, analysis) - scoreSourceForAnalysis(a, analysis) ||
      a.priority - b.priority
  )
}

function buildSourceBuckets(analysis?: SearchQueryAnalysis) {
  const preferred = analysis?.preferredSourceTypes || ['disease_reference', 'treatment_update']
  const deprioritized = new Set(analysis?.deprioritizedSourceTypes || [])

  const buckets = preferred
    .filter(type => !deprioritized.has(type))
    .map(type => ({
      sourceTypes: [type],
      limit: bucketLimit(type, analysis?.intent),
    }))

  if (!analysis || analysis.intent === 'disease_overview') {
    return buckets.concat(
      [...deprioritized].map(type => ({
        sourceTypes: [type],
        limit: 1,
      }))
    )
  }

  return buckets
}

async function createSearchError(provider: string, response: Response) {
  return new Error(`${provider} search failed with ${response.status}`)
}

function extractDomain(value: string) {
  try {
    return new URL(value).hostname
  } catch {
    return ''
  }
}

function prettifyDomain(domain: string) {
  return domain.replace(/^www\./, '')
}

function isBlockedDomain(domain: string, blockedDomains: Set<string>) {
  const normalized = domain.replace(/^www\./, '')
  return blockedDomains.has(domain) || blockedDomains.has(normalized)
}

function isMatchingSourceUrl(
  resultUrl: string,
  source: Pick<SourceRegistryEntry, 'domain' | 'url'>
) {
  if (!resultUrl.includes(source.domain)) return false

  const sourcePath = normalizedPathname(source.url)
  if (sourcePath === '/') return true

  return normalizedPathname(resultUrl).startsWith(sourcePath)
}

function buildAuthorityQuery(
  source: SourceRegistryEntry,
  query: string,
  analysis?: SearchQueryAnalysis
) {
  const baseTerms = analysis?.queryTerms?.length ? analysis.queryTerms.join(' ') : query
  const intentTerms = buildIntentTerms(source, analysis)
  return `site:${source.domain} ${baseTerms} ${intentTerms}`.trim()
}

function buildIntentTerms(source: SourceRegistryEntry, analysis?: SearchQueryAnalysis) {
  const terms: string[] = []

  if (analysis?.intent === 'treatment_update') {
    terms.push('treatment', 'update', 'latest', 'progress')
  }
  if (analysis?.intent === 'clinical_trial') {
    terms.push('clinical trial', 'recruiting')
  }
  if (analysis?.intent === 'drug_approval') {
    terms.push('approval', 'FDA', 'EMA', 'NMPA')
  }
  if (analysis?.intent === 'research_progress') {
    terms.push('research', 'publication')
  }

  return [...new Set(terms)].join(' ')
}

function bucketLimit(
  type: SourceRegistryEntry['sourceTypes'][number],
  intent?: SearchQueryAnalysis['intent']
) {
  if (type === 'treatment_update') return intent === 'treatment_update' ? 3 : 2
  if (type === 'clinical_trial') return intent === 'clinical_trial' ? 3 : 2
  if (type === 'drug_approval') return intent === 'drug_approval' ? 3 : 2
  if (type === 'patient_org') return 2
  if (type === 'research_publication') return 2
  if (type === 'policy_access') return 2
  return 2
}

function maxResultsPerSource(analysis?: SearchQueryAnalysis) {
  return analysis?.intent === 'treatment_update' ? 2 : 3
}

function scoreResultForAnalysis(
  result: { title?: string; url?: string; description?: string },
  analysis?: SearchQueryAnalysis
) {
  const haystack =
    `${result.title || ''} ${result.url || ''} ${result.description || ''}`.toLowerCase()
  let score = 0

  for (const term of analysis?.queryTerms || []) {
    if (term && haystack.includes(term.toLowerCase())) score += 3
  }

  if (analysis?.intent === 'treatment_update') {
    if (/update|latest|progress|trial|phase|approval|news/.test(haystack)) score += 8
    if (/registry|federation|alliance|organisation|organization|directory|list\//.test(haystack))
      score -= 10
    if (/disease\/detail|patient-organisations|research-trials\/registry/.test(haystack))
      score -= 12
  }

  if (analysis?.intent === 'clinical_trial' && /trial|recruiting|study|nct/.test(haystack)) {
    score += 8
  }

  return score
}

function normalizedPathname(value: string) {
  try {
    const pathname = new URL(value).pathname || '/'
    return pathname.endsWith('/') ? pathname : `${pathname}/`
  } catch {
    return '/'
  }
}

function buildSourceSelectionKey(source: Pick<SourceRegistryEntry, 'domain' | 'url'>) {
  return `${source.domain}${normalizedPathname(source.url)}`
}

function scoreSourceForAnalysis(source: SourceRegistryEntry, analysis?: SearchQueryAnalysis) {
  if (!analysis) return 0

  const haystack =
    `${source.name} ${source.domain} ${source.notes || ''} ${source.url}`.toLowerCase()
  let score = 0

  for (const alias of [analysis.subject, ...analysis.aliases].filter(Boolean)) {
    if (haystack.includes(alias.toLowerCase())) score += 20
  }

  for (const term of analysis.queryTerms || []) {
    if (term && haystack.includes(term.toLowerCase())) score += 4
  }

  if (
    analysis.intent === 'treatment_update' &&
    /news|update|progress|clinical|trial/.test(haystack)
  ) {
    score += 6
  }

  return score
}

function isRelevantAuthorityResult(
  result: { title?: string; url?: string; description?: string },
  analysis?: SearchQueryAnalysis
) {
  if (!analysis) return true

  const haystack =
    `${result.title || ''} ${result.url || ''} ${result.description || ''}`.toLowerCase()
  const aliases = [analysis.subject, ...analysis.aliases]
    .filter(Boolean)
    .map(item => item.toLowerCase())
  const hasSubjectMatch = aliases.some(alias => haystack.includes(alias))

  if (analysis.intent === 'treatment_update') {
    if (!hasSubjectMatch) return false
    if (isGenericTreatmentUpdatePage(result)) return false
    return hasTreatmentUpdatePageSignal(result)
  }

  return true
}

function hasTreatmentUpdatePageSignal(result: {
  title?: string
  url?: string
  description?: string
}) {
  const haystack =
    `${result.title || ''} ${result.url || ''} ${result.description || ''}`.toLowerCase()
  return /update|latest|progress|news|trial|phase|approval|approved|clinical|study|recruiting|pipeline|data|press[-\s]?release/.test(
    haystack
  )
}

function isGenericTreatmentUpdatePage(result: {
  title?: string
  url?: string
  description?: string
}) {
  const haystack =
    `${result.title || ''} ${result.url || ''} ${result.description || ''}`.toLowerCase()
  return /\/entry\/|\/disease\/|\/disease\/detail|\/conditions\/|inventory|encyclopaedia|encyclopedia|database|classification|clinical synopsis|overview/.test(
    haystack
  )
}
