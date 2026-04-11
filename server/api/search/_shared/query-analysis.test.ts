import { describe, expect, it } from 'vitest'
import { fallbackAnalyzeSearchQuery } from './query-analysis'

describe('fallbackAnalyzeSearchQuery', () => {
  it('maps latest treatment questions to treatment-update oriented source types', () => {
    const analysis = fallbackAnalyzeSearchQuery('FSHD最新治疗进展')

    expect(analysis.subject).toBe('FSHD')
    expect(analysis.aliases).toEqual(
      expect.arrayContaining([
        'FSHD',
        'facioscapulohumeral muscular dystrophy',
        'facioscapulohumeral dystrophy',
      ])
    )
    expect(analysis.intent).toBe('treatment_update')
    expect(analysis.timeSensitivity).toBe('high')
    expect(analysis.preferredSourceTypes).toContain('treatment_update')
    expect(analysis.preferredSourceTypes).toContain('clinical_trial')
    expect(analysis.deprioritizedSourceTypes).toContain('disease_reference')
  })
})
