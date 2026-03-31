export const SEARCH_MESSAGE_STATUSES = ['completed', 'failed', 'safety_routed'] as const
export const SEARCH_SOURCE_TYPES = [
  'disease_database',
  'drug_approval',
  'clinical_trial',
  'news',
  'policy',
  'patient_support',
  'reference',
] as const

export type SearchMessageStatus = (typeof SEARCH_MESSAGE_STATUSES)[number]
export type SearchSourceType = (typeof SEARCH_SOURCE_TYPES)[number]
export type SearchSourceTier = 'authority' | 'internet_supplement'
export type SearchTraceStatus = 'success' | 'empty' | 'error'

export interface SearchSource {
  title: string
  sourceType: SearchSourceType
  sourceTier: SearchSourceTier
  sourceLabel: string
  sourceUrl: string
  sourceDomain: string
  snippet: string
  publishedAt: string | null
  rank: number
}

export interface SearchTraceEntry {
  key: string
  label: string
  status: SearchTraceStatus
  detail: string
}

export interface SearchResponse {
  query: string
  answer: string
  messageStatus: SearchMessageStatus
  sources: SearchSource[]
  searchTrace: SearchTraceEntry[]
}

export interface SearchCacheEntry {
  id: string
  queryHash: string
  queryText: string
  sourceUrl: string
  sourceDomain: string
  sourceType: SearchSourceType
  title: string
  snippet: string
  content: string
  publishedAt: string | null
  fetchedAt: string
  expiresAt: string
}

export interface SourceRegistryEntry {
  id: string
  name: string
  domain: string
  sourceType: SearchSourceType
  region: string
  language: string
  priority: number
  enabled: boolean
  notes: string | null
}
