<template>
  <div class="search-bar">
    <h1 v-if="status === 'idle'" class="search-bar__heading">
      <span class="search-bar__brand">OpenRD</span> 罕见病信息检索
    </h1>
    <p v-if="status === 'idle'" class="search-bar__subtitle">
      输入罕见病相关关键词，获取权威来源检索结果
    </p>

    <form class="search-bar__form" @submit.prevent="$emit('submit')">
      <div class="search-bar__input-wrap">
        <input
          ref="inputRef"
          :value="modelValue"
          type="text"
          class="search-bar__input"
          placeholder="例如：FSHD 最新治疗进展、庞贝病基因治疗、罕见病临床试验"
          :disabled="status === 'loading'"
          @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        />
        <button
          v-if="status !== 'idle'"
          type="button"
          class="search-bar__clear"
          aria-label="清除搜索"
          @click="$emit('clear')"
        >
          ✕
        </button>
        <button
          type="submit"
          class="search-bar__btn"
          :disabled="!modelValue.trim() || status === 'loading'"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>{{ status === 'loading' ? '搜索中…' : '搜索' }}</span>
        </button>
      </div>
    </form>

    <!-- 搜索示例 -->
    <div v-if="status === 'idle'" class="search-bar__examples">
      <span class="search-bar__examples-label">搜索示例：</span>
      <button
        v-for="item in examples"
        :key="item"
        class="search-bar__example-tag"
        @click="$emit('example', item)"
      >
        {{ item }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { SearchStatus } from '~/composables/useSearch'

defineProps<{
  modelValue: string
  status: SearchStatus
  examples: string[]
}>()

defineEmits<{
  'update:modelValue': [value: string]
  submit: []
  clear: []
  example: [text: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)

defineExpose({ inputRef })
</script>

<style scoped lang="scss">
@use 'variables' as *;

.search-bar {
  width: 100%;
  text-align: center;

  @include desktop {
    max-width: 680px;
    margin: 0 auto;
  }
}

.search-bar__heading {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 $space-s;

  @include desktop {
    font-size: 28px;
  }
}

.search-bar__brand {
  color: $c-primary;
}

.search-bar__subtitle {
  font-size: 14px;
  color: $c-text-secondary;
  margin: 0 0 $space-xl;

  @include desktop {
    font-size: 15px;
  }
}

// ── Form ──────────────────────────────────────────────────────────────────

.search-bar__form {
  margin-bottom: $space-m;
}

.search-bar__input-wrap {
  display: flex;
  align-items: center;
  border: 1px solid $c-border;
  border-radius: $radius;
  background: $c-card-bg;
  box-shadow: $c-card-shadow;
  overflow: hidden;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: $c-primary;
    box-shadow: 0 0 0 2px rgba($c-primary, 0.15);
  }
}

.search-bar__input {
  flex: 1;
  min-width: 0;
  height: 44px;
  padding: 0 $space-m;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 16px;
  color: $c-text;
  outline: none;

  @include desktop {
    height: 48px;
  }

  &::placeholder {
    color: $c-text-muted;
  }

  &:disabled {
    opacity: 0.6;
  }
}

.search-bar__clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-right: $space-xs;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: $c-text-muted;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;

  &:hover {
    background: rgba(0, 0, 0, 0.06);
    color: $c-text-secondary;
  }
}

.search-bar__btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px $space-m;
  margin: $space-xs;
  border: none;
  border-radius: 6px;
  background: $c-primary;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: $c-primary-hover;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// ── Examples ──────────────────────────────────────────────────────────────

.search-bar__examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $space-s;
  justify-content: flex-start;

  @include desktop {
    justify-content: center;
  }
}

.search-bar__examples-label {
  font-size: 13px;
  color: $c-text-muted;
}

.search-bar__example-tag {
  display: inline-block;
  padding: $space-xs 12px;
  border-radius: 999px;
  border: 1px solid $c-border;
  background: $c-card-bg;
  color: $c-text-secondary;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: $c-primary;
    color: $c-primary;
    background: rgba($c-primary, 0.04);
  }
}
</style>
