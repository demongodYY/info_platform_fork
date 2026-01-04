import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async event => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing note id',
    })
  }

  const supabase = await serverSupabaseClient<Database>(event)
  const { data, error } = await supabase.from('notes').select('*').eq('id', id).single()

  if (error) {
    if ((error as any).code === 'PGRST116') {
      throw createError({ statusCode: 404, statusMessage: 'Note not found' })
    }
    console.log('Supabase fetch error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch note from Supabase',
      data: error,
    })
  }

  // Map snake_case from DB to camelCase for the client
  const row = data as Database['public']['Tables']['notes']['Row']
  const note = {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    source: row.source,
    publishedAt: row.published_at,
    updatedBy: row.updated_by,
  }

  return note
})
