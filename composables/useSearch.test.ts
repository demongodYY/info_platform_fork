import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSearch } from './useSearch'
import type { SearchResponse, SearchTraceEntry } from '~/types/search'

// 构造一个模拟的 ReadableStream
function createMockStream(events: string[]) {
  const encoder = new TextEncoder()
  let index = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < events.length) {
        controller.enqueue(encoder.encode(events[index] + '\n'))
        index++
      } else {
        controller.close()
      }
    },
  })
}

function mockFetchStream(events: string[], status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    body: createMockStream(events),
  } as unknown as Response)
}

const traceEvent: SearchTraceEntry[] = [
  { key: 'local-notes', label: '站内内容检索', status: 'empty', detail: 'notes 0 条，cache 0 条' },
]

const resultEvent: SearchResponse = {
  query: '测试搜索',
  answer: '这是 AI 总结',
  messageStatus: 'completed',
  sources: [
    {
      title: '测试来源',
      sourceType: 'reference',
      sourceTier: 'authority',
      sourceLabel: 'NORD',
      sourceUrl: 'https://example.com',
      sourceDomain: 'example.com',
      snippet: '摘要',
      publishedAt: null,
      rank: 1,
    },
  ],
  searchTrace: traceEvent,
}

describe('useSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('初始状态正确', () => {
    const { query, status, trace, result, errorMessage } = useSearch()

    expect(query.value).toBe('')
    expect(status.value).toBe('idle')
    expect(trace.value).toEqual([])
    expect(result.value).toBeNull()
    expect(errorMessage.value).toBe('')
  })

  it('搜索时状态切换到 loading', async () => {
    const events = [JSON.stringify({ type: 'result', result: resultEvent })]
    globalThis.fetch = mockFetchStream(events)

    const { status, search } = useSearch()

    const promise = search('测试')
    expect(status.value).toBe('loading')
    await promise
  })

  it('搜索完成后状态切换到 done', async () => {
    const events = [
      JSON.stringify({ type: 'trace', trace: traceEvent }),
      JSON.stringify({ type: 'result', result: resultEvent }),
    ]
    globalThis.fetch = mockFetchStream(events)

    const { status, trace, result, search } = useSearch()

    await search('测试')

    expect(status.value).toBe('done')
    expect(trace.value).toEqual(traceEvent)
    expect(result.value).toEqual(resultEvent)
  })

  it('空输入不触发搜索', async () => {
    globalThis.fetch = vi.fn()
    const { status, search } = useSearch()

    await search('')
    expect(status.value).toBe('idle')
    expect(globalThis.fetch).not.toHaveBeenCalled()

    await search('   ')
    expect(status.value).toBe('idle')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('HTTP 错误时状态切换到 error', async () => {
    globalThis.fetch = mockFetchStream([], 500)

    const { status, errorMessage, search } = useSearch()

    await search('测试')

    expect(status.value).toBe('error')
    expect(errorMessage.value).toContain('500')
  })

  it('流式 error 事件处理', async () => {
    const events = [JSON.stringify({ type: 'error', message: '搜索失败' })]
    globalThis.fetch = mockFetchStream(events)

    const { status, errorMessage, search } = useSearch()

    await search('测试')

    expect(status.value).toBe('error')
    expect(errorMessage.value).toBe('搜索失败')
  })

  it('未收到结果时状态切换到 error', async () => {
    const events = [JSON.stringify({ type: 'trace', trace: traceEvent })]
    globalThis.fetch = mockFetchStream(events)

    const { status, errorMessage, search } = useSearch()

    await search('测试')

    expect(status.value).toBe('error')
    expect(errorMessage.value).toBe('未收到搜索结果')
  })

  it('网络连接失败时状态切换到 error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'))

    const { status, errorMessage, search } = useSearch()

    await search('测试')

    expect(status.value).toBe('error')
    expect(errorMessage.value).toContain('网络连接失败')
  })

  it('reset 恢复到初始状态', async () => {
    const events = [JSON.stringify({ type: 'result', result: resultEvent })]
    globalThis.fetch = mockFetchStream(events)

    const { query, status, trace, result, errorMessage, search, reset } = useSearch()

    await search('测试')
    expect(status.value).toBe('done')

    reset()
    expect(query.value).toBe('')
    expect(status.value).toBe('idle')
    expect(trace.value).toEqual([])
    expect(result.value).toBeNull()
    expect(errorMessage.value).toBe('')
  })

  it('query ref 更新为搜索词', async () => {
    const events = [JSON.stringify({ type: 'result', result: resultEvent })]
    globalThis.fetch = mockFetchStream(events)

    const { query, search } = useSearch()

    await search('  FSHD 治疗  ')
    expect(query.value).toBe('FSHD 治疗')
  })
})
