<template>
  <li class="source-card">
    <div class="source-card__meta">
      <span
        class="source-card__tier"
        :class="{
          'source-card__tier--authority': source.sourceTier === 'authority',
          'source-card__tier--supplement': source.sourceTier === 'internet_supplement',
        }"
      >
        {{ source.sourceTier === 'authority' ? '权威来源' : '互联网补充' }}
      </span>
      <span class="source-card__site">{{ source.sourceLabel }}</span>
    </div>
    <div class="source-card__headline">
      <a :href="source.sourceUrl" target="_blank" rel="noopener" class="source-card__title">
        {{ source.title }}
      </a>
      <button class="source-card__explain-trigger" type="button" @click="toggleExplain">
        AI一键解读
      </button>
    </div>
    <p class="source-card__snippet">
      {{ source.snippet || '暂无摘要' }}
    </p>
    <div v-if="popoverOpen" class="source-card__popover" role="status" aria-live="polite">
      <p class="source-card__popover-title">AI大白话解读</p>
      <p class="source-card__popover-body">
        {{ popoverText }}
      </p>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SearchSource } from '~/types/search'
import type { SourceExplainResponse } from '~/types/search'

const props = defineProps<{
  source: SearchSource
}>()

type ExplainState = 'idle' | 'loading' | 'success' | 'unavailable'

const popoverOpen = ref(false)
const explainState = ref<ExplainState>('idle')
const explainText = ref('')

const popoverText = computed(() => {
  if (explainState.value === 'loading') {
    return '正在解读这个链接里的内容...'
  }

  return explainText.value || '暂时无法解读'
})

async function toggleExplain() {
  popoverOpen.value = !popoverOpen.value

  if (!popoverOpen.value || explainState.value === 'loading') {
    return
  }

  if (explainState.value === 'success' || explainState.value === 'unavailable') {
    return
  }

  explainState.value = 'loading'
  explainText.value = ''

  try {
    const response = await fetch('/api/search/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: props.source.title,
        sourceUrl: props.source.sourceUrl,
        sourceLabel: props.source.sourceLabel,
        sourceDomain: props.source.sourceDomain,
        snippet: props.source.snippet,
      }),
    })

    if (!response.ok) {
      throw new Error('Explain request failed')
    }

    const payload = (await response.json()) as SourceExplainResponse
    explainState.value = payload.status === 'success' ? 'success' : 'unavailable'
    explainText.value = payload.summary || '暂时无法解读'
  } catch {
    explainState.value = 'unavailable'
    explainText.value = '暂时无法解读'
  }
}
</script>

<style scoped lang="scss">
@use 'variables' as *;

.source-card {
  position: relative;
  padding: 12px;
  border-radius: $radius;
  background: $c-card-bg;
  border: 1px solid $c-border;
  box-shadow: $c-card-shadow;

  @include desktop {
    padding: $space-m;
  }
}

.source-card__headline {
  display: flex;
  align-items: flex-start;
  gap: $space-s;
  margin-bottom: $space-xs;
}

.source-card__meta {
  display: flex;
  align-items: center;
  gap: $space-s;
  margin-bottom: 6px;
}

.source-card__tier {
  display: inline-block;
  padding: 2px $space-s;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.source-card__tier--authority {
  background: $c-green-bg;
  color: $c-green;
}

.source-card__tier--supplement {
  background: #f3f4f6;
  color: $c-text-secondary;
}

.source-card__site {
  font-size: 13px;
  color: $c-text-muted;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-card__title {
  display: block;
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: $c-primary;
  text-decoration: none;
  word-break: break-word;

  @include desktop {
    font-size: 16px;
  }

  &:hover {
    text-decoration: underline;
  }
}

.source-card__explain-trigger {
  flex-shrink: 0;
  padding: 6px 10px;
  border: 1px solid $c-primary;
  border-radius: 999px;
  background: #eef4ff;
  color: $c-primary;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
}

.source-card__snippet {
  margin: 0;
  font-size: 13px;
  color: $c-text-secondary;
  line-height: 1.6;

  @include desktop {
    font-size: 14px;
  }
}

.source-card__popover {
  position: absolute;
  top: calc(100% - 6px);
  right: 12px;
  z-index: 2;
  width: min(320px, calc(100% - 24px));
  padding: 12px;
  border: 1px solid rgba(37, 99, 235, 0.18);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);

  @include desktop {
    right: $space-m;
    width: 320px;
  }

  &::before {
    content: '';
    position: absolute;
    top: -8px;
    right: 22px;
    width: 14px;
    height: 14px;
    background: #fff;
    border-top: 1px solid rgba(37, 99, 235, 0.18);
    border-left: 1px solid rgba(37, 99, 235, 0.18);
    transform: rotate(45deg);
  }
}

.source-card__popover-title {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: $c-primary;
}

.source-card__popover-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: $c-text-secondary;
}
</style>
