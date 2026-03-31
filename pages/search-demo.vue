<template>
  <SearchDemoShell :search="search" />
</template>

<script setup lang="ts">
import SearchDemoShell from '~/components/search/SearchDemoShell.vue'
import type { SearchResponse, SearchTraceEntry } from '~/types/search'

type StreamEvent =
  | {
      type: 'trace'
      trace: SearchTraceEntry[]
    }
  | {
      type: 'result'
      result: SearchResponse
    }
  | {
      type: 'error'
      message: string
    }

const search = async (query: string, onProgress?: (trace: SearchTraceEntry[]) => void) => {
  const response = await fetch('/api/search/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
    }),
  })

  if (!response.ok) {
    throw new Error(`搜索请求失败：${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('搜索流未返回可读数据')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let finalResult: SearchResponse | null = null

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
        onProgress?.(event.trace)
      } else if (event.type === 'result') {
        finalResult = event.result
      } else if (event.type === 'error') {
        throw new Error(event.message)
      }
    }
  }

  if (finalResult) {
    return finalResult
  }

  throw new Error('搜索流未返回最终结果')
}
</script>
