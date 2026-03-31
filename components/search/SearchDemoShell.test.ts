import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SearchDemoShell from './SearchDemoShell.vue'

describe('SearchDemoShell', () => {
  it('submits a query and renders the returned answer, sources, and trace', async () => {
    const search = vi.fn().mockResolvedValue({
      query: 'FSHD 最新治疗进展',
      answer: '这里是聚合后的检索答案。',
      messageStatus: 'completed',
      sources: [
        {
          title: 'NORD update',
          sourceType: 'reference',
          sourceTier: 'authority',
          sourceLabel: 'NORD',
          sourceUrl: 'https://rarediseases.org/example',
          sourceDomain: 'rarediseases.org',
          snippet: 'Latest update',
          publishedAt: '2026-03-20T00:00:00.000Z',
          rank: 1,
        },
      ],
      searchTrace: [
        {
          key: 'authority-search',
          label: '权威来源搜索',
          status: 'success',
          detail: '命中 1 条结果',
        },
      ],
    })

    const wrapper = mount(SearchDemoShell, {
      props: {
        search,
      },
    })

    await wrapper.get('textarea').setValue('FSHD 最新治疗进展')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(search).toHaveBeenCalledWith('FSHD 最新治疗进展', expect.any(Function))
    expect(wrapper.text()).toContain('这里是聚合后的检索答案。')
    expect(wrapper.text()).toContain('NORD update')
    expect(wrapper.text()).toContain('权威来源搜索')
  })

  it('shows staged loading progress before switching to the real search trace', async () => {
    const search = vi
      .fn()
      .mockImplementation(
        async (
          _query: string,
          onProgress?: (
            trace: Array<{ key: string; label: string; status: string; detail: string }>
          ) => void
        ) => {
          onProgress?.([
            {
              key: 'local-notes',
              label: '站内内容检索',
              status: 'empty',
              detail: 'notes 0 条，cache 0 条',
            },
          ])
          await Promise.resolve()

          onProgress?.([
            {
              key: 'local-notes',
              label: '站内内容检索',
              status: 'empty',
              detail: 'notes 0 条，cache 0 条',
            },
            {
              key: 'authority-search',
              label: '权威来源搜索',
              status: 'success',
              detail: '命中 1 条结果',
            },
          ])
          await Promise.resolve()

          onProgress?.([
            {
              key: 'local-notes',
              label: '站内内容检索',
              status: 'empty',
              detail: 'notes 0 条，cache 0 条',
            },
            {
              key: 'authority-search',
              label: '权威来源搜索',
              status: 'success',
              detail: '命中 1 条结果',
            },
            {
              key: 'internet-search',
              label: '互联网补充搜索',
              status: 'success',
              detail: '命中 8 条结果',
            },
          ])

          return {
            query: 'Pompe disease gene therapy',
            answer: '这里是聚合后的检索答案。',
            messageStatus: 'completed',
            sources: [],
            searchTrace: [
              {
                key: 'local-notes',
                label: '站内内容检索',
                status: 'empty',
                detail: 'notes 0 条，cache 0 条',
              },
              {
                key: 'authority-search',
                label: '权威来源搜索',
                status: 'success',
                detail: '命中 1 条结果',
              },
              {
                key: 'internet-search',
                label: '互联网补充搜索',
                status: 'success',
                detail: '命中 8 条结果',
              },
            ],
          }
        }
      )

    const wrapper = mount(SearchDemoShell, {
      props: {
        search,
      },
    })

    await wrapper.get('textarea').setValue('Pompe disease gene therapy')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('notes 0 条，cache 0 条')
    expect(wrapper.text()).toContain('命中 1 条结果')
    expect(wrapper.text()).toContain('命中 8 条结果')
    expect(wrapper.text()).toContain('这里是聚合后的检索答案。')
  })

  it('renders a distinct error state for failed loading steps', async () => {
    let resolveSearch:
      | ((value: {
          query: string
          answer: string
          messageStatus: 'completed'
          sources: []
          searchTrace: Array<{ key: string; label: string; status: 'error'; detail: string }>
        }) => void)
      | null = null

    const search = vi.fn().mockImplementation(
      () =>
        new Promise(resolve => {
          resolveSearch = resolve
        })
    )

    const wrapper = mount(SearchDemoShell, {
      props: {
        search,
      },
    })

    await wrapper.get('textarea').setValue('Pompe disease')
    await wrapper.get('form').trigger('submit.prevent')
    ;(
      search.mock.calls[0]?.[1] as (
        trace: Array<{ key: string; label: string; status: string; detail: string }>
      ) => void
    )([
      {
        key: 'local-notes',
        label: '站内内容检索',
        status: 'empty',
        detail: 'notes 0 条，cache 0 条',
      },
      {
        key: 'authority-search',
        label: '权威来源搜索',
        status: 'error',
        detail: 'SerpApi search failed with 429',
      },
    ])

    await flushPromises()

    const loadingSteps = wrapper.findAll('.search-demo__loading-step')
    expect(loadingSteps[1]?.classes()).toContain('search-demo__loading-step--error')

    resolveSearch?.({
      query: 'Pompe disease',
      answer: 'done',
      messageStatus: 'completed',
      sources: [],
      searchTrace: [
        {
          key: 'local-notes',
          label: '站内内容检索',
          status: 'empty',
          detail: 'notes 0 条，cache 0 条',
        },
        {
          key: 'authority-search',
          label: '权威来源搜索',
          status: 'error',
          detail: 'SerpApi search failed with 429',
        },
      ],
    })
  })
})
