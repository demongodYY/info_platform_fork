import { describe, expect, it } from 'vitest'
import { buildSearchPrompt } from './prompting'

describe('buildSearchPrompt', () => {
  it('bounds treatment conclusions from a guideline landing page without recommendation text', () => {
    const prompt = buildSearchPrompt({
      query: 'sJIA 用药指南',
      evidence: [
        {
          sourceType: 'reference',
          sourceTier: 'authority',
          sourceLabel: 'American College of Rheumatology',
          sourceUrl: 'https://rheumatology.org/juvenile-idiopathic-arthritis-guideline',
          sourceDomain: 'rheumatology.org',
          snippet: 'Official juvenile idiopathic arthritis guideline landing page.',
          publishedAt: null,
          title: 'Juvenile Idiopathic Arthritis Guideline',
          content: 'This page provides access to an official guideline.',
        },
      ],
    })

    const authorityEvidenceSection =
      prompt.split('权威来源证据：')[1]?.split('互联网补充：')[0] || ''
    const internetSupplementSection = prompt.split('互联网补充：')[1] || ''

    expect(authorityEvidenceSection).toContain('American College of Rheumatology')
    expect(authorityEvidenceSection).toContain('Juvenile Idiopathic Arthritis Guideline')
    expect(authorityEvidenceSection).toContain(
      'https://rheumatology.org/juvenile-idiopathic-arthritis-guideline'
    )
    expect(authorityEvidenceSection).toContain(
      'This page provides access to an official guideline.'
    )
    expect(internetSupplementSection).not.toContain(
      'https://rheumatology.org/juvenile-idiopathic-arthritis-guideline'
    )
    const treatmentBoundaryRule = prompt.split('\n').find(line => /不得仅凭/.test(line)) || ''

    expect(prompt).toMatch(/指南落地页|仅说明指南存在/)
    expect(prompt).toMatch(/只能证明.*(?:存在|官方属性)/)
    expect(treatmentBoundaryRule).toMatch(/不得仅凭/)
    expect(treatmentBoundaryRule).toContain('具体药物')
    expect(treatmentBoundaryRule).toContain('剂量')
    expect(treatmentBoundaryRule).toContain('推荐强度')
    expect(treatmentBoundaryRule).toContain('治疗结论')
    expect(prompt).toMatch(/除非.*具体推荐文本/)
  })
})
