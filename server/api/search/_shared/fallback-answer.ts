import type { RetrievedEvidenceItem } from './retrieval'
import { normalizeSearchQuery } from './query-normalization'

export function buildStructuredFallbackAnswer(input: {
  query: string
  evidence: RetrievedEvidenceItem[]
}) {
  const normalized = normalizeSearchQuery(input.query)
  const subject = normalized.resolvedSubject || '这个罕见病主题'

  if (input.evidence.length === 0) {
    return [
      `先直接回答你：如果你现在查的是 ${subject}，我这一轮还没拿到足够稳定的最新证据来支持“最新进展”的判断。`,
      '当前治疗方案：大多数罕见病在现阶段仍以症状管理、康复训练、并发症监测和多学科随访为主，是否有针对性药物、基因治疗或临床试验，需要继续结合具体疾病分型和最新权威来源确认。',
      '最新进展：本轮没有拿到足够可靠的最新结果，所以这里不把早期研究当成已经可用的治疗。',
      '下一步建议：你可以把疾病名、药物名、临床试验编号或想确认的具体问题再说得更细一点，我会继续按权威来源帮你聚合。',
    ].join('\n\n')
  }

  const evidenceSummary = input.evidence
    .slice(0, 3)
    .map(item => `${item.sourceLabel}：${item.snippet}`)
    .join('\n')

  return [
    `先直接回答你：围绕 ${subject}，我已经找到一些可参考的资料，但当前回答属于自动降级整理版，最稳妥的做法还是以下方来源原文为准。`,
    '当前治疗方案：请优先结合下面来源里提到的现行管理方式、标准治疗和适应证信息来理解，不要把早期研究直接当成现成治疗。',
    `最新进展：\n${evidenceSummary}`,
    '下一步建议：你可以继续换更具体的关键词搜索，我也可以在后续接入里被包装成更正式的搜索结果页。',
  ].join('\n\n')
}
