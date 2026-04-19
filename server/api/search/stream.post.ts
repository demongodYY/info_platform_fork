import { readBody } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import { createSearchRepositories } from './_shared/repositories'
import { loadEnabledSourceRegistry } from './_shared/source-registry'
import { buildSearchPrompt } from './_shared/prompting'
import { buildFallbackSearchAnswer, generateSearchAnswer } from './_shared/llm'
import { detectSearchSafetyRisk } from './_shared/safety'
import { analyzeSearchQuery } from './_shared/query-analysis'
import { runSearchFlow } from './_shared/search-flow'
import type { Database } from '~/types/database.types'
import type { SearchResponse, SearchTraceEntry } from '~/types/search'

type SearchStreamEvent =
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

export default defineEventHandler(async event => {
  const body = (await readBody<{ query?: string } | null>(event)) || null
  const query = body?.query?.trim()

  if (!query) {
    return new Response(JSON.stringify({ message: 'Search query is required' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  const supabase = await serverSupabaseClient<Database>(event)
  const repositories = createSearchRepositories(
    supabase as unknown as {
      from: (table: string) => unknown
    }
  )
  const registry = await loadEnabledSourceRegistry(repositories).catch(() => [])
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const push = (payload: SearchStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`))
      }

      ;(async () => {
        try {
          const result = await runSearchFlow({
            query,
            repositories,
            registry,
            analyzeQuery: analyzeSearchQuery,
            detectSafetyRisk: detectSearchSafetyRisk,
            generateAnswer: async ({ query, evidence }) => {
              try {
                return await generateSearchAnswer(
                  buildSearchPrompt({
                    query,
                    evidence,
                  })
                )
              } catch {
                return buildFallbackSearchAnswer({
                  query,
                  evidence,
                })
              }
            },
            onTrace: async trace => {
              push({
                type: 'trace',
                trace,
              })
            },
          })

          push({
            type: 'result',
            result,
          })
        } catch (error: unknown) {
          push({
            type: 'error',
            message: error instanceof Error ? error.message : '搜索失败',
          })
        } finally {
          controller.close()
        }
      })()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
})
