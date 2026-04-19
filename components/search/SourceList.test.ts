import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SourceList from './SourceList.vue'
import type { SearchSource } from '~/types/search'

function makeSource(index: number): SearchSource {
  return {
    title: `来源标题 ${index}`,
    sourceType: 'reference',
    sourceTier: index === 1 ? 'authority' : 'internet_supplement',
    sourceLabel: `来源站点 ${index}`,
    sourceUrl: `https://example.com/article-${index}`,
    sourceDomain: 'example.com',
    snippet: `来源摘要 ${index}`,
    publishedAt: null,
    rank: index,
  }
}

describe('SourceList', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('allows multiple source explain bubbles to stay open independently', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          summary: '这是第一个来源的解读。',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          summary: '这是第二个来源的解读。',
        }),
      } as Response)

    const wrapper = mount(SourceList, {
      props: {
        sources: [makeSource(1), makeSource(2)],
        foldCount: 3,
      },
    })

    const buttons = wrapper.findAll('.source-card__explain-trigger')
    expect(buttons).toHaveLength(2)

    await buttons[0].trigger('click')
    await flushPromises()
    await buttons[1].trigger('click')
    await flushPromises()

    const bubbles = wrapper.findAll('.source-card__popover')
    expect(bubbles).toHaveLength(2)
    expect(wrapper.text()).toContain('这是第一个来源的解读。')
    expect(wrapper.text()).toContain('这是第二个来源的解读。')
  })

  it('shows unavailable copy when explain request fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'unavailable',
        summary: '暂时无法解读',
      }),
    } as Response)

    const wrapper = mount(SourceList, {
      props: {
        sources: [makeSource(1)],
      },
    })

    await wrapper.find('.source-card__explain-trigger').trigger('click')
    await flushPromises()

    expect(wrapper.find('.source-card__popover').text()).toContain('暂时无法解读')
  })
})
