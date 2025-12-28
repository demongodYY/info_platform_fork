<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const route = useRoute()

const id = computed(() => route.params.id)

const { data: note, pending, error } = await useFetch(`/api/notes/${id.value}`)

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
})

const mdContent = computed(() => md.render(note.value?.content ?? ''))
</script>

<template>
  <div class="article-page">
    <div class="article-content" v-html="mdContent"></div>
  </div>
</template>

<style scoped>
.article-page {
  padding: 24px;
}

.article-content {
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.7;
}

.article-content h1,
.article-content h2,
.article-content h3 {
  margin-top: 1.5em;
}

.article-content a {
  color: #2563eb;
}
</style>
