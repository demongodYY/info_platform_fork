// Prebuild import script: scan today's server/articles and upsert notes to Supabase via REST
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

function todayPrefix() {
  const d = new Date()
  const yyyy = d.getFullYear().toString()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

async function pathExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

function parseTitle(content) {
  const lines = content.split('\n')
  for (const l of lines) {
    const m = l.match(/^#\s+(.*)$/)
    if (m) return m[1].trim()
  }
  for (const l of lines) {
    const s = l.trim()
    if (s) return s
  }
  return 'Untitled'
}

function parseCategories(content) {
  const m = content.match(/\*\*[^\n]*标签[^\n]*\*\*\s*([^\n]+)/)
  if (m && m[1]) {
    const raw = m[1].trim()
    const normalized = raw
      .split('·')
      .map(s => s.trim())
      .filter(Boolean)
      .join(',')
    return normalized || null
  }
  return null
}

function parseSource(content) {
  const m = content.match(/\*\*[^\n]*原文链接[^\n]*\*\*\s*\[[^\]]*\]\(([^\)]+)\)/)
  if (m && m[1]) return m[1].trim()
  return null
}

async function readMarkdown(filePath) {
  const buf = await fs.readFile(filePath, 'utf-8')
  const title = parseTitle(buf)
  const category = parseCategories(buf)
  const source = parseSource(buf)
  return { title, content: buf, category, source }
}

async function upsertNoteByTitleRest(supabaseUrl, supabaseKey, note) {
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  const selRes = await fetch(
    `${supabaseUrl}/rest/v1/notes?select=id,title&title=eq.${encodeURIComponent(note.title)}`,
    { method: 'GET', headers }
  )
  let existingId = null
  if (selRes.ok) {
    const rows = await selRes.json()
    if (Array.isArray(rows) && rows.length > 0) existingId = rows[0].id
  } else {
    console.warn('Supabase select error:', selRes.statusText)
  }

  if (existingId) {
    const updatePayload = {
      content: note.content,
      category: note.category ?? '',
      source: note.source ?? '',
      updated_by: 'system',
    }
    const updRes = await fetch(
      `${supabaseUrl}/rest/v1/notes?id=eq.${encodeURIComponent(existingId)}`,
      { method: 'PATCH', headers, body: JSON.stringify(updatePayload) }
    )
    if (!updRes.ok) console.warn('Supabase update error:', updRes.statusText)
    return existingId
  } else {
    const now = new Date().toISOString()
    const id = randomUUID()
    const insertPayload = {
      id,
      title: note.title,
      content: note.content,
      category: note.category ?? '',
      source: note.source ?? '',
      published_at: now,
      updated_by: 'system',
    }
    const insRes = await fetch(`${supabaseUrl}/rest/v1/notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(insertPayload),
    })
    if (!insRes.ok) console.warn('Supabase insert error:', insRes.statusText)
    return id
  }
}

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
  if (!url || !key) {
    console.warn('Supabase URL/KEY missing; skip prebuild import.')
    return
  }

  const root = join(process.cwd(), 'server', 'articles')
  if (!(await pathExists(root))) return

  const prefix = todayPrefix()
  const entries = await fs.readdir(root, { withFileTypes: true })
  const todayDirs = entries
    .filter(e => e.isDirectory() && e.name.startsWith(prefix))
    .map(e => join(root, e.name))

  for (const dir of todayDirs) {
    const domains = await fs.readdir(dir, { withFileTypes: true })
    for (const d of domains) {
      if (!d.isDirectory()) continue
      const mdPro = join(dir, d.name, 'markdown_professional')
      if (!(await pathExists(mdPro))) continue
      const files = await fs.readdir(mdPro, { withFileTypes: true })
      const mdFiles = files.filter(f => f.isFile() && f.name.endsWith('.md'))
      for (const f of mdFiles) {
        const fp = join(mdPro, f.name)
        const note = await readMarkdown(fp)
        await upsertNoteByTitleRest(url, key, note)
      }
    }
  }
}

// Execute only when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Prebuild import error:', err?.message || err)
    process.exitCode = 1
  })
}
