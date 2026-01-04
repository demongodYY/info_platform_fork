import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async event => {
  // Get Supabase client from Nuxt module (typed)
  const supabase = await serverSupabaseClient<Database>(event)

  // Fetch all notes from Supabase, newest first
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('published_at', { ascending: false })

  if (error) {
    console.log('Supabase fetch error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch notes from Supabase',
      data: error,
    })
  }

  const notes = (data || []).map((n: any) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    category: n.category,
    source: n.source,
    publishedAt: n.published_at,
    updatedBy: n.updated_by,
  }))

  return { notes }
})
