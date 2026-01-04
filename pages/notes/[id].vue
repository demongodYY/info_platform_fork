<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import type { NoteDetail } from '~/types/notes'

const route = useRoute()

const id = computed(() => {
  const value = route.params.id
  return Array.isArray(value) ? value[0] : value
})

const {
  data: note,
  pending,
  error,
} = useFetch<NoteDetail>(() => `/api/notes/${id.value}`, {
  key: () => `note-${id.value}`,
  lazy: true,
})

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
})

const mdContent = computed(() => md.render((note.value as NoteDetail | undefined)?.content ?? ''))
</script>

<template>
  <div class="note-detail">
    <NuxtLink to="/" class="back-btn">← Back</NuxtLink>

    <div v-if="pending" class="skeleton">
      <div class="skeleton__title" />
      <div class="skeleton__meta" />
      <div class="skeleton__content">
        <div v-for="n in 12" :key="n" class="skeleton__line" />
      </div>
    </div>

    <p v-else-if="error" class="error">Failed to load note</p>

    <div v-else class="content" v-html="mdContent" />
  </div>
</template>

<style scoped lang="scss">
.note-detail {
  padding: 24px;

  .back-btn {
    display: inline-block;
    margin-bottom: 16px;
    color: #555;
    text-decoration: none;
    font-size: 20px;

    &:hover {
      text-decoration: underline;
    }
  }

  .content {
    line-height: 1.7;
  }

  .error {
    padding: 12px 16px;
    border-radius: 8px;
    background: #fee2e2;
    color: #b91c1c;
  }

  .skeleton {
    display: flex;
    flex-direction: column;
    gap: 16px;

    &__title,
    &__meta,
    &__line {
      position: relative;
      overflow: hidden;
      background: #e5e7eb;
      border-radius: 999px;

      &::after {
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
    }

    &__title {
      height: 28px;
      width: 70%;
    }

    &__meta {
      height: 16px;
      width: 40%;
    }

    &__content {
      display: grid;
      gap: 10px;
    }

    &__line {
      height: 12px;
      width: 100%;
    }
  }
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
