<template>
  <div class="page">
    <header class="hero">
      <div>
        <h1 class="title">文章列表</h1>
      </div>
      <NuxtLink to="/notes/edit" class="primary-btn">创建文章</NuxtLink>
    </header>

    <section v-if="pending" class="status status--loading">
      <div class="skeleton-grid">
        <div v-for="n in 3" :key="n" class="skeleton-card">
          <div class="skeleton-title" />
          <div class="skeleton-meta" />
          <div class="skeleton-content">
            <div v-for="i in 4" :key="i" class="skeleton-line" />
          </div>
          <div class="skeleton-footer" />
        </div>
      </div>
    </section>

    <section v-else-if="error" class="status status--error">
      <p>加载笔记失败：{{ error.message }}</p>
    </section>

    <section v-else>
      <div v-if="notes.length" class="notes-grid">
        <article v-for="note in notes" :key="note.id" class="note-card">
          <header class="note-card__header">
            <NuxtLink :to="`/notes/${note.id}`" class="note-card__title">
              {{ note.title }}
            </NuxtLink>
            <div class="note-card__meta">
              <div class="note-card__tags">
                <span v-for="tag in note.tags" :key="tag" class="badge">{{ tag }}</span>
              </div>
              <a
                v-if="note.source"
                :href="note.source"
                target="_blank"
                rel="noopener"
                class="note-card__source-link"
              >
                查看原文
              </a>
              <span>{{ formatDate(note.publishedAt) }}</span>
            </div>
          </header>
          <div class="note-card__preview">
            <div class="note-card__preview-body" v-html="renderPreview(note.content)" />
          </div>
          <footer class="note-card__footer">
            <NuxtLink :to="`/notes/${note.id}`" class="text-link">View detail →</NuxtLink>
          </footer>
        </article>
      </div>
      <div v-else class="status">
        <p>
          No notes yet — go ahead and
          <NuxtLink to="/notes/edit" class="text-link">create one</NuxtLink>.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { computed } from 'vue'
import type { NoteDetail } from '~/types/notes'

type NotesResponse = { notes: NoteDetail[] }

const { data, pending, error } = useFetch<NotesResponse>('/api/notes', {
  key: 'notes-list',
  lazy: true,
})

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
})

const notes = computed(() =>
  (data.value?.notes ?? []).map(note => ({
    ...note,
    tags: note.category
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean),
  }))
)

const formatDate = (value: string) => {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

const renderPreview = (content: string) => {
  if (!content) return ''
  const snippet = content.length > 800 ? `${content.slice(0, 800)}\n\n…` : content
  return md.render(snippet)
}
</script>

<style scoped lang="scss">
.page {
  padding: 32px 20px;
  margin: 0 auto;
  max-width: 960px;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 32px;
}

.title {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 700;
}

.subtitle {
  margin: 0;
  color: #555;
}

.primary-btn {
  padding: 10px 18px;
  background: #2563eb;
  color: #fff;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  transition: background 0.2s ease;

  &:hover {
    background: #1d4ed8;
  }
}

.status {
  padding: 16px;
  border-radius: 8px;
  background: #f5f5f5;
  color: #444;
}

.status--error {
  background: #fee2e2;
  color: #b91c1c;
}

.status--loading {
  background: transparent;
  padding: 0;
}

.skeleton-grid {
  display: grid;
  gap: 20px;
}

.skeleton-card {
  padding: 20px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-title,
.skeleton-meta,
.skeleton-line,
.skeleton-footer {
  position: relative;
  overflow: hidden;
  background: #e5e7eb;
  border-radius: 999px;
}

.skeleton-title {
  height: 22px;
  width: 60%;
}

.skeleton-meta {
  height: 14px;
  width: 40%;
}

.skeleton-content {
  display: grid;
  gap: 8px;
  padding: 8px 0;
}

.skeleton-line {
  height: 10px;
  width: 100%;
}

.skeleton-footer {
  height: 14px;
  width: 30%;
}

.skeleton-title::after,
.skeleton-meta::after,
.skeleton-line::after,
.skeleton-footer::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.6) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: shimmer 1.6s infinite;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

.notes-grid {
  display: grid;
  gap: 20px;
}

.note-card {
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note-card__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.note-card__title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.note-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6b7280;
}

.note-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.note-card__source-link {
  margin-left: auto;
  font-weight: 600;
  color: #2563eb;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 600;
}

.note-card__preview {
  margin: 0;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(59, 130, 246, 0.04));
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: 10px;
  padding: 12px;
  font-size: 14px;
}

.note-card__preview-body {
  color: #334155;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-clamp: 6;
  -webkit-line-clamp: 6;
}

.note-card__footer {
  margin-top: auto;
}

.text-link {
  color: #2563eb;
  text-decoration: none;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
}

@media (max-width: 640px) {
  .hero {
    flex-direction: column;
    align-items: stretch;
  }

  .primary-btn {
    display: inline-block;
    text-align: center;
  }
}
</style>
