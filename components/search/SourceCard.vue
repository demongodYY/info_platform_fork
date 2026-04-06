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
    <a :href="source.sourceUrl" target="_blank" rel="noopener" class="source-card__title">
      {{ source.title }}
    </a>
    <p class="source-card__snippet">
      {{ source.snippet || '暂无摘要' }}
    </p>
  </li>
</template>

<script setup lang="ts">
import type { SearchSource } from '~/types/search'

defineProps<{
  source: SearchSource
}>()
</script>

<style scoped lang="scss">
@use 'variables' as *;

.source-card {
  padding: 12px;
  border-radius: $radius;
  background: $c-card-bg;
  border: 1px solid $c-border;
  box-shadow: $c-card-shadow;

  @include desktop {
    padding: $space-m;
  }
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
  font-size: 15px;
  font-weight: 600;
  color: $c-primary;
  text-decoration: none;
  margin-bottom: $space-xs;
  word-break: break-word;

  @include desktop {
    font-size: 16px;
  }

  &:hover {
    text-decoration: underline;
  }
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
</style>
