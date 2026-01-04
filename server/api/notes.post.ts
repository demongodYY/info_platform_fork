import { serverSupabaseClient } from '#supabase/server'
import { randomUUID } from 'node:crypto'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async event => {
  // Get Supabase client from Nuxt module
  const supabase = await serverSupabaseClient(event)

  // Parse request body with expected fields
  const body = await readBody(event)
  const { title, content, category, source } = body || {}

  // Validate required fields
  const required = { title, content, category, source }
  const missing = Object.entries(required)
    .filter(([_, v]) => typeof v !== 'string' || v.trim() === '')
    .map(([k]) => k)

  if (missing.length) {
    throw createError({
      statusCode: 400,
      statusMessage: `Missing or invalid fields: ${missing.join(', ')}`,
    })
  }

  // Always generate id server-side
  const id = randomUUID()

  // Server-side fields
  const publishedAt = new Date().toISOString()
  const updatedBy = 'system'

  // Insert note into Supabase (map camelCase to snake_case)
  const payload: Database['public']['Tables']['notes']['Insert'] = {
    id,
    title,
    content,
    category,
    source,
    published_at: publishedAt,
    updated_by: updatedBy,
  }

  const { data, error } = await supabase
    .from('notes')
    .insert(payload as any)
    .select()

  if (error) {
    console.log('Supabase insert error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create note in Supabase',
      data: error,
    })
  }

  return {
    success: true,
    note: Array.isArray(data) ? data[0] : data,
  }
})
