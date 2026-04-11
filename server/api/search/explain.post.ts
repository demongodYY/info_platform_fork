import { readBody } from 'h3'
import { explainSource } from './_shared/explain-source'
import type { SourceExplainRequest } from '~/types/search'

export default defineEventHandler(async event => {
  const body = (await readBody<Partial<SourceExplainRequest> | null>(event)) || null

  if (!body?.sourceUrl?.trim() || !body?.title?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Source title and URL are required',
    })
  }

  return explainSource({
    title: body.title.trim(),
    sourceUrl: body.sourceUrl.trim(),
    sourceLabel: body.sourceLabel?.trim() || body.sourceDomain?.trim() || '未知来源',
    sourceDomain: body.sourceDomain?.trim() || '',
    snippet: body.snippet?.trim() || '',
  })
})
