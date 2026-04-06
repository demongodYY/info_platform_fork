<template>
  <section v-if="sources.length" class="source-list">
    <h3 class="source-list__heading">📚 信息来源</h3>

    <ul class="source-list__items">
      <SourceCard v-for="(src, idx) in visibleSources" :key="src.sourceUrl + idx" :source="src" />
    </ul>

    <button
      v-if="sources.length > foldCount"
      class="source-list__toggle"
      @click="expanded = !expanded"
    >
      {{ expanded ? '收起' : `展开更多 (共${sources.length}条)` }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SearchSource } from '~/types/search'
import SourceCard from './SourceCard.vue'

const props = withDefaults(
  defineProps<{
    sources: SearchSource[]
    foldCount?: number
  }>(),
  { foldCount: 3 }
)

const expanded = ref(false)

const visibleSources = computed(() =>
  expanded.value ? props.sources : props.sources.slice(0, props.foldCount)
)
</script>

<style scoped lang="scss">
@use 'variables' as *;

.source-list__heading {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 $space-m;
  color: $c-text;

  @include desktop {
    font-size: 18px;
  }
}

.source-list__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: $space-s;

  @include desktop {
    gap: $space-m;
  }
}

.source-list__toggle {
  display: block;
  width: 100%;
  margin-top: $space-m;
  padding: 10px 0;
  border: 1px dashed $c-border;
  border-radius: $radius;
  background: none;
  color: $c-primary;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: $c-card-bg;
  }
}
</style>
