import { describe, expect, it } from 'vitest'
import { parseRareInfoList } from './source-registry'

describe('parseRareInfoList', () => {
  it('prefers reference-style categories over duplicated drug approval rows for the same domain', () => {
    const content = [
      '分类\t名称\tURL\t备注\t区域\t语言\t说明',
      '药物审批\tOrphanet\thttps://www.orpha.net/en\t\tglobal\ten\t审批入口',
      '数据库\tOrphanet\thttps://www.orpha.net/en/disease\t\tglobal\ten\t百科入口',
      '学术\tBioBuzz\thttps://www.biobuzz.io\t\tglobal\ten\t行业资讯',
    ].join('\n')

    const registry = parseRareInfoList(content)
    const orpha = registry.find(entry => entry.url === 'https://www.orpha.net/en/disease')

    expect(orpha?.sourceType).toBe('reference')
    expect(orpha?.url).toBe('https://www.orpha.net/en/disease')
  })

  it('keeps multiple entry paths for the same domain instead of collapsing them into one record', () => {
    const content = [
      '分类\t名称\tURL\t备注\t区域\t语言\t说明',
      '数据库/信息库\tNORD 罕见病数据库\thttps://rarediseases.org/rare-diseases\t\t美国\ten\t疾病百科入口',
      '患者援助\tNORD 患者援助项目\thttps://rarediseases.org/patients/help-now/\t\t美国\ten\t患者援助入口',
      '患者组织/社群\tNORD 会员网络\thttps://rarediseases.org/organizations\t\t美国\ten\t组织目录入口',
    ].join('\n')

    const registry = parseRareInfoList(content)
    const nordEntries = registry.filter(entry => entry.domain === 'rarediseases.org')

    expect(nordEntries).toHaveLength(3)
    expect(nordEntries.map(entry => entry.url)).toEqual(
      expect.arrayContaining([
        'https://rarediseases.org/rare-diseases',
        'https://rarediseases.org/patients/help-now/',
        'https://rarediseases.org/organizations',
      ])
    )
  })
})
