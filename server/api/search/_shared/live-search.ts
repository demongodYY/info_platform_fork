import type { SourceRegistryEntry } from '~/types/search'
import type { RetrievedEvidenceItem } from './retrieval'

export async function searchWhitelistedSources(
  query: string,
  registry: SourceRegistryEntry[]
): Promise<RetrievedEvidenceItem[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []

  const prioritizedSources = rankSourcesForQuery(registry, trimmedQuery).slice(0, 8)
  const results = await Promise.allSettled(
    prioritizedSources.map(source => searchSingleSource(trimmedQuery, source))
  )

  return dedupeEvidenceItems(flattenSettledResults(results)).slice(0, 8)
}

export async function searchInternetSupplementSources(
  query: string,
  registry: SourceRegistryEntry[]
): Promise<RetrievedEvidenceItem[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []

  const blockedDomains = new Set(registry.map(source => source.domain))
  const serpApiKey = process.env.SERPAPI_KEY

  if (serpApiKey) {
    return searchInternetWithSerpApiOrFallback(trimmedQuery, blockedDomains, serpApiKey)
  }

  return searchInternetWithDuckDuckGo(trimmedQuery, blockedDomains)
}

async function searchSingleSource(
  query: string,
  source: SourceRegistryEntry
): Promise<RetrievedEvidenceItem[]> {
  const serpApiKey = process.env.SERPAPI_KEY
  if (serpApiKey) {
    try {
      return await searchWithSerpApi(query, source, serpApiKey)
    } catch {
      return searchWithDuckDuckGo(query, source)
    }
  }

  return searchWithDuckDuckGo(query, source)
}

async function searchInternetWithSerpApiOrFallback(
  query: string,
  blockedDomains: Set<string>,
  serpApiKey: string
): Promise<RetrievedEvidenceItem[]> {
  try {
    return await searchInternetWithSerpApi(query, blockedDomains, serpApiKey)
  } catch {
    return searchInternetWithDuckDuckGo(query, blockedDomains)
  }
}

async function searchWithSerpApi(
  query: string,
  source: SourceRegistryEntry,
  serpApiKey: string
): Promise<RetrievedEvidenceItem[]> {
  const searchQuery = new URLSearchParams({
    engine: 'google',
    q: `site:${source.domain} ${query}`,
    api_key: serpApiKey,
    num: '5',
  })

  const response = await fetch(`https://serpapi.com/search.json?${searchQuery.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw await createSearchError('SerpApi', response)
  }

  const payload = (await response.json()) as SerpApiResponse
  return parseSerpApiResults(payload, source)
}

async function searchInternetWithSerpApi(
  query: string,
  blockedDomains: Set<string>,
  serpApiKey: string
): Promise<RetrievedEvidenceItem[]> {
  const searchQuery = new URLSearchParams({
    engine: 'google',
    q: query,
    api_key: serpApiKey,
    num: '6',
    hl: 'zh-cn',
  })

  const response = await fetch(`https://serpapi.com/search.json?${searchQuery.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw await createSearchError('SerpApi', response)
  }

  const payload = (await response.json()) as SerpApiResponse
  return parseInternetSerpApiResults(payload, blockedDomains)
}

async function searchWithDuckDuckGo(
  query: string,
  source: SourceRegistryEntry
): Promise<RetrievedEvidenceItem[]> {
  const searchQuery = encodeURIComponent(`site:${source.domain} ${query}`)
  const response = await fetch(`https://html.duckduckgo.com/html/?q=${searchQuery}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
  })

  if (!response.ok) {
    return []
  }

  const html = await response.text()
  return parseDuckDuckGoHtml(html, source)
}

async function searchInternetWithDuckDuckGo(
  query: string,
  blockedDomains: Set<string>
): Promise<RetrievedEvidenceItem[]> {
  const searchQuery = encodeURIComponent(query)
  const response = await fetch(`https://html.duckduckgo.com/html/?q=${searchQuery}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
  })

  if (!response.ok) {
    return []
  }

  const html = await response.text()
  return parseInternetDuckDuckGoHtml(html, blockedDomains)
}

interface SerpApiResponse {
  organic_results?: Array<{
    title?: string
    link?: string
    snippet?: string
  }>
  news_results?: Array<{
    title?: string
    link?: string
    snippet?: string
  }>
}

function parseSerpApiResults(
  payload: SerpApiResponse,
  source: Pick<SourceRegistryEntry, 'name' | 'domain' | 'sourceType'>
): RetrievedEvidenceItem[] {
  const items: RetrievedEvidenceItem[] = []
  for (const result of [...(payload.organic_results || []), ...(payload.news_results || [])]) {
    const url = result.link || ''
    if (!url.includes(source.domain)) continue

    items.push({
      sourceType: source.sourceType,
      sourceTier: 'authority',
      sourceLabel: source.name,
      sourceUrl: url,
      sourceDomain: source.domain,
      snippet: (result.snippet || '').trim(),
      publishedAt: null,
      title: (result.title || '').trim(),
      content: (result.snippet || '').trim(),
    })
  }

  return items
}

function parseInternetSerpApiResults(
  payload: SerpApiResponse,
  blockedDomains: Set<string>
): RetrievedEvidenceItem[] {
  const items: RetrievedEvidenceItem[] = []
  for (const result of payload.organic_results || []) {
    const url = result.link || ''
    const domain = extractDomain(url)
    if (!url || !domain || isBlockedDomain(domain, blockedDomains)) continue

    items.push({
      sourceType: 'news',
      sourceTier: 'internet_supplement',
      sourceLabel: prettifyDomain(domain),
      sourceUrl: url,
      sourceDomain: domain,
      snippet: (result.snippet || '').trim(),
      publishedAt: null,
      title: (result.title || domain).trim(),
      content: (result.snippet || '').trim(),
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

function parseDuckDuckGoHtml(
  html: string,
  source: Pick<SourceRegistryEntry, 'name' | 'domain' | 'sourceType'>
): RetrievedEvidenceItem[] {
  const matches = [
    ...html.matchAll(
      /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
    ),
  ]

  const items: RetrievedEvidenceItem[] = []
  for (const match of matches) {
    const url = decodeHtml(match[1] || '')
    if (!url.includes(source.domain)) continue

    const title = stripTags(decodeHtml(match[2] || ''))
    const snippet = stripTags(decodeHtml(match[3] || ''))
    items.push({
      sourceType: source.sourceType,
      sourceTier: 'authority',
      sourceLabel: source.name,
      sourceUrl: url,
      sourceDomain: source.domain,
      snippet,
      publishedAt: null,
      title,
      content: snippet,
    })
  }

  return items
}

function parseInternetDuckDuckGoHtml(
  html: string,
  blockedDomains: Set<string>
): RetrievedEvidenceItem[] {
  const matches = [
    ...html.matchAll(
      /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
    ),
  ]

  const items: RetrievedEvidenceItem[] = []
  for (const match of matches) {
    const url = decodeHtml(match[1] || '')
    const domain = extractDomain(url)
    if (!url || !domain || isBlockedDomain(domain, blockedDomains)) continue

    const snippet = stripTags(decodeHtml(match[3] || ''))
    items.push({
      sourceType: 'news',
      sourceTier: 'internet_supplement',
      sourceLabel: prettifyDomain(domain),
      sourceUrl: url,
      sourceDomain: domain,
      snippet,
      publishedAt: null,
      title: stripTags(decodeHtml(match[2] || '')) || prettifyDomain(domain),
      content: snippet,
    })
  }

  return items
}

function rankSourcesForQuery(registry: SourceRegistryEntry[], query: string) {
  const lowered = query.toLowerCase()
  return [...registry].sort(
    (a, b) => scoreSource(b, lowered) - scoreSource(a, lowered) || a.priority - b.priority
  )
}

function scoreSource(source: SourceRegistryEntry, query: string) {
  let score = 0
  if (/trial|临床试验|nct/.test(query) && source.sourceType === 'clinical_trial') score += 10
  if (/drug|药|approval|审批/.test(query) && source.sourceType === 'drug_approval') score += 10
  if (
    /policy|医保|援助|support|help/.test(query) &&
    ['policy', 'patient_support'].includes(source.sourceType)
  )
    score += 8
  if (
    /symptom|disease|诊断|症状|基因/.test(query) &&
    ['reference', 'news'].includes(source.sourceType)
  )
    score += 6
  if (
    /china|中国|国内/.test(query) &&
    /china|中文|中国/i.test(`${source.region} ${source.language} ${source.notes || ''}`)
  )
    score += 4
  return score
}

async function createSearchError(provider: string, response: Response) {
  return new Error(`${provider} search failed with ${response.status}`)
}

function stripTags(value: string) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
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
