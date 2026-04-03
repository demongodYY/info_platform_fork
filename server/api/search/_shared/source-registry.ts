import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { SourceRegistryEntry } from '~/types/search'
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

function parseRareInfoList(content: string): SourceRegistryEntry[] {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const byDomain = new Map<string, SourceRegistryEntry>()

  for (const line of lines.slice(1)) {
    const columns = line.split('\t')
    if (columns.length < 6) continue

    const [category, name, url, , region, language, notes = ''] = columns
    if (!url.startsWith('http')) continue

    let domain = ''
    try {
      domain = new URL(url).hostname.replace(/^www\./, '')
    } catch {
      continue
    }

    if (byDomain.has(domain)) continue

    byDomain.set(domain, {
      id: domain,
      name,
      domain,
      sourceType: mapCategoryToSourceType(category),
      region,
      language,
      priority: byDomain.size + 1,
      enabled: true,
      notes: notes || null,
    })
  }

  return [...byDomain.values()]
}

function mapCategoryToSourceType(category: string): SourceRegistryEntry['sourceType'] {
  if (/临床试验/i.test(category)) return 'clinical_trial'
  if (/药物|审批/i.test(category)) return 'drug_approval'
  if (/政策/i.test(category)) return 'policy'
  if (/患者|社群|援助/i.test(category)) return 'patient_support'
  if (/数据库|信息库|学术/i.test(category)) return 'reference'
  return 'news'
}
