import { ref } from 'vue'
import type { SearchResponse, SearchTraceEntry } from '~/types/search'

export type SearchStatus = 'idle' | 'loading' | 'done' | 'error'

type StreamEvent =
  | { type: 'trace'; trace: SearchTraceEntry[] }
  | { type: 'result'; result: SearchResponse }
  | { type: 'error'; message: string }

export function useSearch() {
  const query = ref('')
  const status = ref<SearchStatus>('idle')
  const trace = ref<SearchTraceEntry[]>([])
  const result = ref<SearchResponse | null>(null)
  const errorMessage = ref('')

  async function search(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return

    query.value = trimmed
    status.value = 'loading'
    trace.value = []
    result.value = null
    errorMessage.value = ''

    let response: Response
    try {
      response = await fetch('/api/search/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      })
    } catch {
      status.value = 'error'
      errorMessage.value = '网络连接失败，请检查网络后重试'
      return
    }

    if (!response.ok) {
      status.value = 'error'
      errorMessage.value = `搜索请求失败：${response.status}`
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      status.value = 'error'
      errorMessage.value = '搜索流未返回可读数据'
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let receivedResult = false

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue

          const event = JSON.parse(line) as StreamEvent

          if (event.type === 'trace') {
            trace.value = event.trace
          } else if (event.type === 'result') {
            result.value = event.result
            receivedResult = true
          } else if (event.type === 'error') {
            status.value = 'error'
            errorMessage.value = event.message
            return
          }
        }
      }
    } catch {
      status.value = 'error'
      errorMessage.value = '搜索流读取中断'
      return
    }

    if (receivedResult) {
      status.value = 'done'
    } else {
      status.value = 'error'
      errorMessage.value = '未收到搜索结果'
    }
  }

  function reset() {
    query.value = ''
    status.value = 'idle'
    trace.value = []
    result.value = null
    errorMessage.value = ''
  }

  return {
    query,
    status,
    trace,
    result,
    errorMessage,
    search,
    reset,
  }
}
