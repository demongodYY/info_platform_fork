<template>
  <section v-if="result" class="result-panel">
    <header class="result-panel__header">
      <p class="result-panel__eyebrow">Search Result</p>
      <h2 class="result-panel__title">{{ result.query }}</h2>
      <p class="result-panel__status" :class="`result-panel__status--${result.messageStatus}`">
        {{ statusLabel }}
      </p>
    </header>

    <article class="result-panel__answer">
      <h3>聚合回答</h3>
      <p v-for="paragraph in answerParagraphs" :key="paragraph">{{ paragraph }}</p>
    </article>

    <section class="result-panel__trace">
      <h3>检索过程</h3>
      <ul v-if="result.searchTrace.length" class="result-panel__list">
        <li v-for="item in result.searchTrace" :key="item.key" class="trace-item">
          <span class="trace-item__badge" :class="`trace-item__badge--${item.status}`">{{
            item.label
          }}</span>
          <span>{{ item.detail }}</span>
        </li>
      </ul>
      <p v-else class="result-panel__empty">本轮未返回检索过程明细。</p>
    </section>

    <section class="result-panel__sources">
      <h3>来源卡片</h3>
      <ul v-if="result.sources.length" class="result-panel__list">
        <li
          v-for="source in result.sources"
          :key="`${source.rank}-${source.sourceUrl}`"
          class="source-card"
        >
          <div class="source-card__meta">
            <span class="source-card__tier">{{
              source.sourceTier === 'authority' ? '权威来源' : '互联网补充'
            }}</span>
            <span>{{ source.sourceLabel }}</span>
          </div>
          <a :href="source.sourceUrl" target="_blank" rel="noopener" class="source-card__title">
            {{ source.title }}
          </a>
          <p class="source-card__snippet">{{ source.snippet || '暂无摘要' }}</p>
        </li>
      </ul>
      <p v-else class="result-panel__empty">本轮暂未检索到可引用来源。</p>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SearchResponse } from '~/types/search'

const props = defineProps<{
  result: SearchResponse | null
}>()

const answerParagraphs = computed(() =>
  (props.result?.answer || '')
    .split(/\n{2,}/)
    .map(item => item.trim())
    .filter(Boolean)
)

const statusLabel = computed(() => {
  if (!props.result) return ''
  if (props.result.messageStatus === 'safety_routed') return '安全分流'
  if (props.result.messageStatus === 'failed') return '降级回答'
  return '正常完成'
})
</script>

<style scoped lang="scss">
.result-panel {
  display: grid;
  gap: 20px;
}

.result-panel__header,
.result-panel__answer,
.result-panel__trace,
.result-panel__sources {
  padding: 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.result-panel__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #0f766e;
}

.result-panel__title {
  margin: 0;
  font-size: 28px;
}

.result-panel__status {
  margin: 12px 0 0;
  font-weight: 600;
}

.result-panel__status--completed {
  color: #166534;
}

.result-panel__status--failed {
  color: #92400e;
}

.result-panel__status--safety_routed {
  color: #b91c1c;
}

.result-panel__list {
  display: grid;
  gap: 12px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.trace-item,
.source-card {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 18px;
  background: #f8fafc;
}

.trace-item__badge,
.source-card__tier {
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.trace-item__badge--success,
.source-card__tier {
  background: #dcfce7;
  color: #166534;
}

.trace-item__badge--empty {
  background: #fef3c7;
  color: #92400e;
}

.trace-item__badge--error {
  background: #fee2e2;
  color: #b91c1c;
}

.source-card__meta {
  display: flex;
  gap: 10px;
  align-items: center;
  color: #475569;
  font-size: 14px;
}

.source-card__title {
  color: #0f172a;
  font-weight: 700;
  text-decoration: none;
}

.source-card__title:hover {
  text-decoration: underline;
}

.source-card__snippet,
.result-panel__empty {
  margin: 0;
  color: #475569;
}
</style>
