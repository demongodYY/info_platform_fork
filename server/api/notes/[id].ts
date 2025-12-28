import { noteDetails } from '../../mock/notes'

export default defineEventHandler(event => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing note id',
    })
  }

  const note = noteDetails.find(n => n.id === id)

  if (!note) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Note not found',
    })
  }

  return note
})
