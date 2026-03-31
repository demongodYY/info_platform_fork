<template>
  <section class="search-demo">
    <header class="search-demo__hero">
      <p class="search-demo__eyebrow">Internal Demo</p>
      <h1>罕见病信息聚合搜索</h1>
      <p>
        这是给你内部调试效果用的单次搜索页。它保留大模型聚合、站内检索、权威来源搜索和互联网补充搜索，但不再保留会话、登录和用户概念。
      </p>
    </header>

    <form class="search-demo__form" @submit.prevent="handleSubmit">
      <label class="search-demo__label" for="query">输入搜索词</label>
      <textarea
        id="query"
        v-model="draft"
        class="search-demo__textarea"
        :disabled="loading"
        placeholder="例如：FSHD 最新治疗进展 / 某药物审批状态 / 某罕见病临床试验"
      />
      <div class="search-demo__actions">
        <button type="submit" class="search-demo__button" :disabled="loading">
          {{ loading ? '搜索中…' : '开始搜索' }}
        </button>
        <span v-if="errorMessage" class="search-demo__error">{{ errorMessage }}</span>
      </div>
    </form>

    <section v-if="loadingTrace.length" class="search-demo__loading">
      <div class="search-demo__loading-header">
        <p class="search-demo__loading-eyebrow">Search In Progress</p>
        <h2>检索进行中</h2>
        <p>正在依次执行站内检索、权威来源搜索、互联网补充搜索和大模型聚合整理。</p>
      </div>

      <div class="search-demo__loading-list" aria-live="polite">
        <article
          v-for="(step, index) in loadingTrace"
          :key="step.key"
          class="search-demo__loading-step"
          :class="{
            'search-demo__loading-step--active': activeLoadingIndex === index,
            'search-demo__loading-step--done':
              (activeLoadingIndex > index || !loading) && step.status !== 'error',
            'search-demo__loading-step--error': step.status === 'error',
          }"
        >
          <span class="search-demo__loading-dot" />
          <div>
            <p class="search-demo__loading-title">{{ step.label }}</p>
            <p class="search-demo__loading-copy">{{ step.detail }}</p>
          </div>
        </article>
      </div>
    </section>

    <SearchResultPanel :result="result" />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import SearchResultPanel from './SearchResultPanel.vue'
import type { SearchResponse, SearchTraceEntry } from '~/types/search'

const props = defineProps<{
  search: (
    query: string,
    onProgress?: (trace: SearchTraceEntry[]) => void
  ) => Promise<SearchResponse>
}>()

const draft = ref('')
const loading = ref(false)
const errorMessage = ref('')
const result = ref<SearchResponse | null>(null)
const progressTrace = ref<SearchTraceEntry[]>([])

const baseLoadingSteps: SearchTraceEntry[] = [
  {
    key: 'local-notes',
    label: '站内内容检索',
    status: 'success',
    detail: '正在检索站内内容',
  },
  {
    key: 'authority-search',
    label: '权威来源搜索',
    status: 'success',
    detail: '正在查找权威来源',
  },
  {
    key: 'internet-search',
    label: '互联网补充搜索',
    status: 'success',
    detail: '正在补充互联网结果',
  },
  {
    key: 'llm-aggregation-loading',
    label: '大模型聚合整理',
    status: 'success',
    detail: '正在整理最终回答',
  },
]

const loadingTrace = computed(() => {
  if (!loading.value) return []

  const completed = progressTrace.value.map(item => ({
    ...item,
    status: item.status === 'error' ? 'error' : 'success',
  }))
  const nextStep = baseLoadingSteps.find(step => !completed.some(item => item.key === step.key))

  return nextStep ? [...completed, nextStep] : completed
})

const activeLoadingIndex = computed(() =>
  Math.min(progressTrace.value.length, Math.max(loadingTrace.value.length - 1, 0))
)

const handleSubmit = async () => {
  const query = draft.value.trim()
  if (!query || loading.value) return

  loading.value = true
  errorMessage.value = ''
  progressTrace.value = []
  result.value = null

  try {
    result.value = await props.search(query, trace => {
      progressTrace.value = trace
    })
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => {})

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { statusMessage?: string } }).data
    if (data?.statusMessage) return data.statusMessage
  }

  if (error instanceof Error && error.message) return error.message
  return '搜索失败。'
}
</script>

<style scoped lang="scss">
.search-demo {
  min-height: 100vh;
  padding: 28px;
  background:
    radial-gradient(circle at top left, rgba(34, 197, 94, 0.18), transparent 28%),
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.14), transparent 24%),
    linear-gradient(180deg, #f3fbf8 0%, #eef4ff 100%);
  display: grid;
  gap: 24px;
}

.search-demo__hero,
.search-demo__form,
.search-demo__loading {
  max-width: 1080px;
  width: 100%;
  margin: 0 auto;
  padding: 24px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.07);
  backdrop-filter: blur(14px);
}

.search-demo__eyebrow {
  margin: 0 0 10px;
  color: #0f766e;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 700;
}

.search-demo__hero h1 {
  margin: 0 0 12px;
  font-size: clamp(34px, 5vw, 56px);
  line-height: 1.05;
}

.search-demo__hero p {
  margin: 0;
  max-width: 780px;
  color: #475569;
  line-height: 1.7;
}

.search-demo__form {
  display: grid;
  gap: 14px;
}

.search-demo__label {
  font-weight: 700;
  color: #0f172a;
}

.search-demo__textarea {
  min-height: 138px;
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 22px;
  padding: 18px 20px;
  font: inherit;
  font-size: 17px;
  line-height: 1.6;
  background: #fff;
}

.search-demo__textarea:focus {
  outline: 2px solid rgba(13, 148, 136, 0.25);
  border-color: #0d9488;
}

.search-demo__actions {
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
}

.search-demo__button {
  border: 0;
  border-radius: 999px;
  padding: 12px 22px;
  background: linear-gradient(135deg, #0f766e 0%, #0369a1 100%);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.search-demo__button:disabled {
  cursor: wait;
  opacity: 0.75;
}

.search-demo__error {
  color: #b91c1c;
  font-weight: 600;
}

.search-demo__loading {
  max-width: 1080px;
  width: 100%;
  margin: 0 auto;
  display: grid;
  gap: 18px;
  color: #0f172a;
}

.search-demo__loading-header h2 {
  margin: 0 0 8px;
  font-size: 28px;
}

.search-demo__loading-header p {
  margin: 0;
  color: #475569;
}

.search-demo__loading-eyebrow {
  margin: 0 0 8px;
  color: #0f766e;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 700;
}

.search-demo__loading-list {
  display: grid;
  gap: 12px;
}

.search-demo__loading-step {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 16px 18px;
  border-radius: 20px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.16);
  opacity: 0.72;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.search-demo__loading-step--active,
.search-demo__loading-step--done {
  opacity: 1;
}

.search-demo__loading-step--active {
  border-color: rgba(13, 148, 136, 0.35);
  background: linear-gradient(135deg, rgba(240, 253, 250, 1) 0%, rgba(239, 246, 255, 1) 100%);
  transform: translateY(-1px);
}

.search-demo__loading-step--done {
  border-color: rgba(34, 197, 94, 0.22);
}

.search-demo__loading-step--error {
  opacity: 1;
  border-color: rgba(239, 68, 68, 0.35);
  background: linear-gradient(135deg, rgba(254, 242, 242, 1) 0%, rgba(255, 255, 255, 1) 100%);
}

.search-demo__loading-dot {
  width: 14px;
  height: 14px;
  margin-top: 4px;
  border-radius: 999px;
  background: #cbd5e1;
  box-shadow: 0 0 0 4px rgba(203, 213, 225, 0.3);
}

.search-demo__loading-step--active .search-demo__loading-dot {
  background: #0d9488;
  box-shadow: 0 0 0 6px rgba(13, 148, 136, 0.16);
}

.search-demo__loading-step--done .search-demo__loading-dot {
  background: #22c55e;
  box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.12);
}

.search-demo__loading-step--error .search-demo__loading-dot {
  background: #ef4444;
  box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.12);
}

.search-demo__loading-title {
  margin: 0 0 4px;
  font-weight: 700;
}

.search-demo__loading-copy {
  margin: 0;
  color: #475569;
}

@media (max-width: 768px) {
  .search-demo {
    padding: 16px;
  }

  .search-demo__hero,
  .search-demo__form,
  .search-demo__loading {
    padding: 18px;
    border-radius: 22px;
  }
}
</style>
