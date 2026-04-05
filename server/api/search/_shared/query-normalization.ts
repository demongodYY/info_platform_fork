const SUBJECT_ALIAS_MAP = [
  {
    canonical: 'FSHD',
    aliases: [
      'FSHD',
      'facioscapulohumeral muscular dystrophy',
      'facioscapulohumeral dystrophy',
      '面肩肱型肌营养不良',
      '面肩肱肌营养不良',
    ],
  },
]

export function normalizeSearchQuery(query: string) {
  const trimmed = query.trim()
  const subject = findSubject(trimmed)

  return {
    resolvedSubject: subject,
    localQuery: subject || trimmed,
    effectiveQuery: trimmed,
  }
}

function findSubject(message: string) {
  const lowered = message.toLowerCase()
  for (const entry of SUBJECT_ALIAS_MAP) {
    if (entry.aliases.some(alias => lowered.includes(alias.toLowerCase()))) {
      return entry.canonical
    }
  }

  return ''
}
