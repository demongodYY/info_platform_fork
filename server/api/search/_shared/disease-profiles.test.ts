import { describe, expect, it } from 'vitest'

import {
  findDiseaseProfile,
  getAuthoritySourceTypesForIntent,
  listDiseaseAliases,
} from './disease-profiles'

describe('disease profiles', () => {
  it('resolves every registered FSHD and sJIA alias from the shared profile registry', () => {
    expect(findDiseaseProfile('面肩肱型肌营养不良')?.canonical).toBe('FSHD')
    expect(findDiseaseProfile('systemic-onset JIA')?.canonical).toBe('sJIA')
    expect(listDiseaseAliases('sJIA')).toContain('系统性幼年特发性关节炎')
  })

  it('uses the profile capability when a disease has a clinical-trial source override', () => {
    expect(getAuthoritySourceTypesForIntent('sJIA', 'clinical_trial')).toEqual(['treatment_update'])
    expect(getAuthoritySourceTypesForIntent('FSHD', 'clinical_trial')).toEqual(['clinical_trial'])
  })
})
