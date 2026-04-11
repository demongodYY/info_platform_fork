import { generateSearchAnswer } from './llm'
import { buildSourceExplainPrompt } from './prompting'
import type { SourceExplainRequest, SourceExplainResponse } from '~/types/search'

interface BraveLlmContextResponse {
  grounding?: {
    generic?: Array<{
      url?: string
      title?: string
      snippets?: string[]
    }>
  }
}

interface ExplainSourceOptions {
  generateSummary?: (prompt: string) => Promise<string>
}

const UNAVAILABLE_RESPONSE: SourceExplainResponse = {
  status: 'unavailable',
  summary: '暂时无法解读',
  matchedUrl: null,
}

export async function explainSource(
  input: SourceExplainRequest,
  options: ExplainSourceOptions = {}
): Promise<SourceExplainResponse> {
  const sourceUrl = input.sourceUrl.trim()
  const braveApiKey = process.env.BRAVE_API_KEY

  if (!sourceUrl || !braveApiKey) {
    return UNAVAILABLE_RESPONSE
  }

  try {
    const context = await fetchBraveContext(input, braveApiKey)
    const matched = pickBestMatch(sourceUrl, context.grounding?.generic || [], input.title)

    if (!matched) {
      return UNAVAILABLE_RESPONSE
    }

    const content = matched.snippets.join('\n')
    if (!content.trim()) {
      return UNAVAILABLE_RESPONSE
    }

    const generateSummary =
      options.generateSummary ||
      (async (prompt: string) => {
        const result = await generateSearchAnswer(prompt)
        return result.content
      })

    const summary = (
      await generateSummary(
        buildSourceExplainPrompt({
          title: input.title,
          sourceLabel: input.sourceLabel,
          sourceUrl,
          snippet: input.snippet,
          content,
        })
      )
    ).trim()

    if (!summary) {
      return UNAVAILABLE_RESPONSE
    }

    return {
      status: 'success',
      summary,
      matchedUrl: matched.url,
    }
  } catch {
    return UNAVAILABLE_RESPONSE
  }
}

async function fetchBraveContext(input: SourceExplainRequest, braveApiKey: string) {
  const response = await fetch('https://api.search.brave.com/res/v1/llm/context', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Subscription-Token': braveApiKey,
    },
    body: JSON.stringify({
      q: buildExplainQuery(input),
      count: 5,
      maximum_number_of_urls: 5,
      maximum_number_of_snippets: 12,
      maximum_number_of_snippets_per_url: 6,
      maximum_number_of_tokens: 2600,
      maximum_number_of_tokens_per_url: 1200,
      context_threshold_mode: 'lenient',
    }),
  })

  if (!response.ok) {
    throw new Error(`Brave LLM context failed with ${response.status}`)
  }

  return (await response.json()) as BraveLlmContextResponse
}

function buildExplainQuery(input: SourceExplainRequest) {
  const domainHint = input.sourceDomain ? `site:${input.sourceDomain}` : ''
  const titleHint = input.title ? `"${input.title}"` : ''
  const pathHint = extractPathTokens(input.sourceUrl).join(' ')
  const snippetHint = input.snippet.split(/\s+/).slice(0, 12).join(' ')

  return [domainHint, titleHint, pathHint, snippetHint].filter(Boolean).join(' ').trim()
}

function pickBestMatch(
  sourceUrl: string,
  candidates: NonNullable<BraveLlmContextResponse['grounding']>['generic'],
  sourceTitle: string
) {
  const normalizedSourceUrl = normalizeUrl(sourceUrl)
  const scored = candidates
    .map(candidate => ({
      ...candidate,
      score: scoreCandidate(normalizedSourceUrl, sourceTitle, candidate),
    }))
    .filter(candidate => candidate.url && (candidate.snippets?.length || 0) > 0)
    .sort((left, right) => right.score - left.score)

  const best = scored[0]
  if (!best || best.score < 3) {
    return null
  }

  return {
    url: best.url || sourceUrl,
    snippets: best.snippets || [],
  }
}

function scoreCandidate(
  normalizedSourceUrl: string,
  sourceTitle: string,
  candidate: {
    url?: string
    title?: string
  }
) {
  const candidateUrl = normalizeUrl(candidate.url || '')
  if (!candidateUrl) return 0
  if (candidateUrl === normalizedSourceUrl) return 10

  let score = 0
  const source = tryParseUrl(normalizedSourceUrl)
  const target = tryParseUrl(candidateUrl)
  if (!source || !target) return score

  if (source.hostname === target.hostname) score += 1
  if (source.pathname === target.pathname) score += 4

  const sourceTokens = new Set(extractPathTokens(normalizedSourceUrl))
  const candidateTokens = extractPathTokens(candidateUrl)
  score += candidateTokens.filter(token => sourceTokens.has(token)).length

  const normalizedSourceTitle = normalizeText(sourceTitle)
  const normalizedCandidateTitle = normalizeText(candidate.title || '')
  if (
    normalizedSourceTitle &&
    normalizedCandidateTitle &&
    (normalizedSourceTitle.includes(normalizedCandidateTitle) ||
      normalizedCandidateTitle.includes(normalizedSourceTitle))
  ) {
    score += 2
  }

  return score
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value)
    const pathname = url.pathname.replace(/\/+$/, '') || '/'
    return `${url.protocol}//${url.hostname}${pathname}`
  } catch {
    return ''
  }
}

function tryParseUrl(value: string) {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function extractPathTokens(value: string) {
  const parsed = tryParseUrl(value)
  if (!parsed) return []

  return parsed.pathname
    .split('/')
    .flatMap(part => part.split(/[-_.]+/))
    .map(token => token.trim().toLowerCase())
    .filter(token => token.length >= 3)
}

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}
