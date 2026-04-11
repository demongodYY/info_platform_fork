import type { SearchCacheEntry, SourceRegistryEntry } from '~/types/search'
import type { Database } from '~/types/database.types'

type DbClient = {
  from: (table: string) => unknown
}

export interface SearchRepositories {
  searchNotes(query: string): Promise<
    Array<{
      title: string
      content: string
      source: string
      publishedAt: string
    }>
  >
  searchCache(query: string): Promise<SearchCacheEntry[]>
  listEnabledSources(): Promise<SourceRegistryEntry[]>
}

export function createSearchRepositories(supabase: DbClient): SearchRepositories {
  return {
    async searchNotes(query) {
      const { data, error } = await (
        supabase.from('notes') as {
          select: (value: string) => {
            or: (value: string) => {
              order: (
                column: string,
                options: { ascending: boolean }
              ) => {
                limit: (
                  count: number
                ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>
              }
            }
          }
        }
      )
        .select('title, content, source, published_at')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('published_at', { ascending: false })
        .limit(5)

      if (error) {
        if (isMissingRelationError(error)) {
          return []
        }
        throw error
      }

      return ((data || []) as Array<Database['public']['Tables']['notes']['Row']>).map(row => ({
        title: row.title,
        content: row.content,
        source: row.source,
        publishedAt: row.published_at,
      }))
    },

    async searchCache(query) {
      const { data, error } = await (
        supabase.from('search_cache') as {
          select: (value: string) => {
            ilike: (
              column: string,
              value: string
            ) => {
              order: (
                column: string,
                options: { ascending: boolean }
              ) => {
                limit: (
                  count: number
                ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>
              }
            }
          }
        }
      )
        .select('*')
        .ilike('query_text', `%${query}%`)
        .order('fetched_at', { ascending: false })
        .limit(5)

      if (error) {
        if (isMissingRelationError(error)) {
          return []
        }
        throw error
      }

      return ((data || []) as Array<Record<string, unknown>>).map(row => ({
        id: asString(row.id),
        queryHash: asString(row.query_hash),
        queryText: asString(row.query_text),
        sourceUrl: asString(row.source_url),
        sourceDomain: asString(row.source_domain),
        sourceType: asSearchSourceType(row.source_type),
        title: asString(row.title),
        snippet: asString(row.snippet),
        content: asString(row.content),
        publishedAt: asNullableString(row.published_at),
        fetchedAt: asString(row.fetched_at),
        expiresAt: asString(row.expires_at),
      }))
    },

    async listEnabledSources() {
      const { data, error } = await (
        supabase.from('source_registry') as {
          select: (value: string) => {
            eq: (
              column: string,
              value: boolean
            ) => {
              order: (
                column: string,
                options: { ascending: boolean }
              ) => Promise<{
                data: unknown
                error: { code?: string; message?: string } | null
              }>
            }
          }
        }
      )
        .select('*')
        .eq('enabled', true)
        .order('priority', { ascending: true })

      if (error) {
        if (isMissingRelationError(error)) {
          return []
        }
        throw error
      }

      return ((data || []) as Array<Record<string, unknown>>).map(row => ({
        id: asString(row.id),
        name: asString(row.name),
        domain: asString(row.domain),
        url: asString(row.url) || `https://${asString(row.domain)}`,
        sourceType: asSearchSourceType(row.source_type),
        sourceTypes: asAuthoritySourceTypes(row.source_types, row.source_type),
        region: asString(row.region),
        language: asString(row.language),
        priority: typeof row.priority === 'number' ? row.priority : Number(row.priority || 0),
        enabled: Boolean(row.enabled),
        notes: asNullableString(row.notes),
      }))
    },
  }
}

export function isMissingRelationError(error: { code?: string; message?: string }) {
  return (
    error.code === '42P01' ||
    /does not exist/i.test(error.message || '') ||
    /schema cache/i.test(error.message || '')
  )
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function asNullableString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function asSearchSourceType(value: unknown): SearchCacheEntry['sourceType'] {
  return typeof value === 'string' ? (value as SearchCacheEntry['sourceType']) : 'reference'
}

function asAuthoritySourceTypes(
  sourceTypes: unknown,
  sourceType: unknown
): SourceRegistryEntry['sourceTypes'] {
  if (Array.isArray(sourceTypes)) {
    return sourceTypes.filter(
      item => typeof item === 'string'
    ) as SourceRegistryEntry['sourceTypes']
  }

  const normalized = typeof sourceType === 'string' ? sourceType : 'reference'
  switch (normalized) {
    case 'clinical_trial':
      return ['clinical_trial']
    case 'drug_approval':
      return ['drug_approval']
    case 'policy':
      return ['policy_access']
    case 'patient_support':
      return ['patient_org']
    case 'news':
      return ['treatment_update']
    case 'reference':
    case 'disease_database':
    default:
      return ['disease_reference']
  }
}
