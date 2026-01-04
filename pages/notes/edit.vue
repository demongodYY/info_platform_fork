<template>
  <div class="edit-page">
    <NuxtLink to="/" class="back-link">← 返回列表</NuxtLink>
    <h1 class="heading">Create Note</h1>
    <p class="hint">Fill in the fields below to publish a new note to Supabase.</p>

    <form class="form" @submit.prevent="handleSubmit">
      <div class="grid">
        <label class="field">
          <span>Title</span>
          <input v-model="form.title" type="text" placeholder="Enter a descriptive title" />
        </label>
        <label class="field">
          <span>Categories</span>
          <input
            v-model="form.categoriesRaw"
            type="text"
            placeholder="e.g. Advocacy, Featured News"
          />
          <small class="field__hint">Separate multiple categories with commas</small>
          <div v-if="categories.length" class="tag-preview">
            <span v-for="tag in categories" :key="tag" class="tag-preview__badge">{{ tag }}</span>
          </div>
        </label>
        <label class="field">
          <span>Source</span>
          <input v-model="form.source" type="text" placeholder="e.g. NORD" />
        </label>
      </div>

      <label class="field">
        <span>Content</span>
        <textarea
          v-model="form.content"
          rows="10"
          placeholder="Paste the markdown/HTML content for this note"
        />
      </label>

      <div v-if="errorMessage" class="alert alert--error">{{ errorMessage }}</div>
      <div v-if="successMessage" class="alert alert--success">{{ successMessage }}</div>

      <div class="actions">
        <button type="submit" :disabled="submitDisabled">
          {{ submitting ? 'Saving…' : 'Publish Note' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { refreshNuxtData } from '#app'
import { computed, reactive, ref } from 'vue'

interface CreateNoteResponse {
  success?: boolean
  note?: { id?: string }
}

const form = reactive({
  title: '',
  categoriesRaw: '',
  source: '',
  content: '',
})

const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const categories = computed(() =>
  form.categoriesRaw
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
)

const submitDisabled = computed(() => {
  if (submitting.value) return true
  return (
    !form.title.trim() || !categories.value.length || !form.source.trim() || !form.content.trim()
  )
})

const resetForm = () => {
  form.title = ''
  form.categoriesRaw = ''
  form.source = ''
  form.content = ''
}

const handleSubmit = async () => {
  if (submitDisabled.value) return

  submitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await $fetch<CreateNoteResponse>('/api/notes', {
      method: 'POST',
      body: {
        title: form.title.trim(),
        category: categories.value.join(','),
        source: form.source.trim(),
        content: form.content.trim(),
      },
    })

    await refreshNuxtData('notes-list')

    const noteId = response.note?.id
    if (noteId) {
      resetForm()
      successMessage.value = 'Note created successfully! Redirecting…'
      submitting.value = false
      await navigateTo(`/notes/${noteId}`)
      return
    }

    resetForm()
    successMessage.value = 'Note created successfully!'
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Failed to create note.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.edit-page {
  padding: 32px 20px;
  max-width: 720px;
  margin: 0 auto;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.back-link {
  display: inline-block;
  margin-bottom: 16px;
  color: #2563eb;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.heading {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
}

.hint {
  margin: 0 0 24px;
  color: #4b5563;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-weight: 600;
  color: #1f2937;

  input,
  textarea {
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 400;
    color: #111827;
    font-family: inherit;
    resize: vertical;

    &:focus {
      outline: 2px solid #2563eb;
      outline-offset: 1px;
    }
  }

  textarea {
    min-height: 220px;
  }
}

.field__hint {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.tag-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-preview__badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 600;
  font-size: 12px;
}

.alert {
  padding: 12px 16px;
  border-radius: 8px;
  font-weight: 600;
}

.alert--error {
  background: #fee2e2;
  color: #b91c1c;
}

.alert--success {
  background: #dcfce7;
  color: #166534;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

button {
  padding: 12px 20px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: #1d4ed8;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
