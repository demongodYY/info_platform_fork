import type { RetrievedEvidenceItem } from './retrieval'
import { normalizeSearchQuery } from './query-normalization'

export function buildSearchPrompt(input: { query: string; evidence: RetrievedEvidenceItem[] }) {
  const normalized = normalizeSearchQuery(input.query)
  const authorityEvidence = input.evidence.filter(item => item.sourceTier !== 'internet_supplement')
  const internetSupplementEvidence = input.evidence.filter(
    item => item.sourceTier === 'internet_supplement'
  )

  const evidence = authorityEvidence
    .map(
      item =>
        `[权威来源｜${item.sourceLabel}] ${item.title}\nURL: ${item.sourceUrl}\n摘要: ${item.snippet}\n内容: ${item.content.slice(0, 400)}`
    )
    .join('\n\n')

  const internetSupplement = internetSupplementEvidence
    .map(
      item =>
        `[互联网补充｜${item.sourceLabel}] ${item.title}\nURL: ${item.sourceUrl}\n摘要: ${item.snippet}\n内容: ${item.content.slice(0, 320)}`
    )
    .join('\n\n')

  return `
你是一个罕见病信息聚合搜索助手。
要求：
- 第一段先直接回答搜索问题，不要空泛开场
- 使用通俗易懂的中文
- 不提供诊断或处方级建议
- 明确指出信息边界
- 结论必须尽量基于给定证据
- 优先使用权威来源得出结论
- 如果用了互联网补充信息，要明确说这是补充参考
- 如果没有证据，不要编造具体药名、技术名或研究项目名
- 输出请严格按以下结构组织：
  1. 直接结论
  2. 当前已知信息
  3. 最新进展
  4. 建议继续搜索的方向

用户搜索词：
${input.query}

当前推断疾病主题：
${normalized.resolvedSubject || '未明确'}

推荐检索表达：
${normalized.effectiveQuery || input.query}

权威来源证据：
${evidence || '暂无权威证据'}

互联网补充：
${internetSupplement || '暂无互联网补充'}
`.trim()
}
