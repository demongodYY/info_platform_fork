import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { AuthoritySourceType, SourceRegistryEntry } from '~/types/search'
import type { SearchRepositories } from './repositories'

export async function loadEnabledSourceRegistry(
  repositories: Pick<SearchRepositories, 'listEnabledSources'>
): Promise<SourceRegistryEntry[]> {
  const registry = await repositories.listEnabledSources()
  if (registry.length > 0) {
    return registry
  }

  return loadSourceRegistryFromRareInfoList()
}

async function loadSourceRegistryFromRareInfoList(): Promise<SourceRegistryEntry[]> {
  const filePath = await resolveRareInfoListPath(process.cwd())
  const content = await readFile(filePath, 'utf-8')
  return parseRareInfoList(content)
}

function buildRareInfoListCandidatePaths(cwd: string) {
  const candidates = new Set<string>()
  let current = cwd

  for (let index = 0; index < 5; index += 1) {
    candidates.add(resolve(current, 'rare_disease_bot/rare_info_list.txt'))
    current = dirname(current)
  }

  return [...candidates]
}

async function resolveRareInfoListPath(cwd: string) {
  for (const candidate of buildRareInfoListCandidatePaths(cwd)) {
    try {
      await access(candidate)
      return candidate
    } catch {
      continue
    }
  }

  throw new Error('Could not locate rare_info_list.txt from current workspace')
}

export function parseRareInfoList(content: string): SourceRegistryEntry[] {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const bySourceKey = new Map<string, SourceRegistryEntry>()

  for (const line of lines.slice(1)) {
    const columns = line.split('\t')
    if (columns.length < 6) continue

    const [category, name, url, description = '', region, language, notes = ''] = columns
    if (!url.startsWith('http')) continue

    let domain = ''
    try {
      domain = new URL(url).hostname.replace(/^www\./, '')
    } catch {
      continue
    }

    const nextSourceTypes = mapCategoryToAuthoritySourceTypes(category, name, description, notes)
    const nextType = mapAuthoritySourceTypesToPrimary(nextSourceTypes)
    const sourceKey = buildSourceRegistryKey(domain, url)
    const existing = bySourceKey.get(sourceKey)

    if (existing) {
      const mergedSourceTypes = [...new Set([...existing.sourceTypes, ...nextSourceTypes])]
      const preferredType = mapAuthoritySourceTypesToPrimary(mergedSourceTypes)
      bySourceKey.set(sourceKey, {
        ...existing,
        name: pickPreferredValue(existing.name, name),
        url: pickPreferredUrl(existing.url, url),
        sourceType: preferredType,
        sourceTypes: mergedSourceTypes,
        region: pickPreferredValue(existing.region, region),
        language: pickPreferredValue(existing.language, language),
        notes: pickPreferredNotes(existing.notes, notes),
      })
      continue
    }

    bySourceKey.set(sourceKey, {
      id: sourceKey,
      name,
      domain,
      url,
      sourceType: nextType,
      sourceTypes: nextSourceTypes,
      region,
      language,
      priority: bySourceKey.size + 1,
      enabled: true,
      notes: notes || null,
    })
  }

  return [...bySourceKey.values()]
}

function mapCategoryToAuthoritySourceTypes(
  category: string,
  name: string,
  description: string,
  notes: string
) {
  const combined = `${category} ${name} ${description} ${notes}`
  const sourceTypes = new Set<AuthoritySourceType>()

  if (/临床试验|trial/i.test(combined)) sourceTypes.add('clinical_trial')
  if (/药物|审批|prime|fda|ema|nmpa/i.test(combined)) sourceTypes.add('drug_approval')
  if (/政策|法规|医保|准入/i.test(combined)) sourceTypes.add('policy_access')
  if (/患者|社群|组织|协会|联盟|基金会|援助|society|association|foundation|support/i.test(combined))
    sourceTypes.add('patient_org')
  if (/期刊|文献|学术|journal|pubmed|gene/i.test(combined)) sourceTypes.add('research_publication')
  if (/资讯|新闻|progress|update|news/i.test(combined)) sourceTypes.add('treatment_update')
  if (/数据库|信息库|百科|omim|gard|orphanet|genereviews/i.test(combined))
    sourceTypes.add('disease_reference')

  if (sourceTypes.size === 0) {
    sourceTypes.add('treatment_update')
  }

  return [...sourceTypes]
}

function mapAuthoritySourceTypesToPrimary(
  sourceTypes: AuthoritySourceType[]
): SourceRegistryEntry['sourceType'] {
  if (sourceTypes.includes('disease_reference')) return 'reference'
  if (sourceTypes.includes('research_publication')) return 'reference'
  if (sourceTypes.includes('clinical_trial')) return 'clinical_trial'
  if (sourceTypes.includes('drug_approval')) return 'drug_approval'
  if (sourceTypes.includes('policy_access')) return 'policy'
  if (sourceTypes.includes('patient_org')) return 'patient_support'
  return 'news'
}

function pickPreferredValue(current: string, next: string) {
  return current || next
}

function pickPreferredNotes(current: string | null, next: string) {
  return current || next || null
}

function pickPreferredUrl(current: string, next: string) {
  const currentPath = safePathname(current)
  const nextPath = safePathname(next)
  if (currentPath === '/' && nextPath !== '/') return next
  if (nextPath.length > currentPath.length) return next
  return current
}

function safePathname(value: string) {
  try {
    return new URL(value).pathname || '/'
  } catch {
    return '/'
  }
}

function buildSourceRegistryKey(domain: string, url: string) {
  const path = safePathname(url)
  return `${domain}${path === '/' ? '' : path}`
}
