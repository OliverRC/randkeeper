<script setup lang="ts">
import { marked } from 'marked'
const p = defineProps<{ period: string; note: string }>()
const editing = ref(false)
const draft = ref('')
const text = ref(p.note)
watch(() => p.note, n => { text.value = n; editing.value = false })
// Escape first so the note can't inject HTML; marked then adds markup from markdown only.
const html = computed(() => marked.parse(text.value.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!)), { async: false }) as string)
function edit() { draft.value = text.value; editing.value = true }
async function save() { text.value = draft.value; editing.value = false; await $fetch('/api/budgets', { method: 'PUT', body: { period: p.period, note: draft.value } }) }
</script>
<template>
  <UCard :ui="{ body: 'p-4 sm:p-4' }">
    <div v-if="editing" class="space-y-2">
      <UTextarea v-model="draft" :rows="6" autofocus class="w-full font-mono text-sm" placeholder="Notes for this period — markdown works: **bold**, - lists, [links](url)" />
      <div class="flex justify-end gap-2"><UButton size="xs" variant="ghost" color="neutral" label="Cancel" @click="editing = false" /><UButton size="xs" label="Save" @click="save" /></div>
    </div>
    <div v-else class="group flex gap-3">
      <div class="flex-1 min-w-0">
        <div v-if="text" class="note" v-html="html" />
        <button v-else class="text-sm text-muted hover:text-primary" @click="edit">Add a note for this period…</button>
      </div>
      <UButton v-if="text" size="xs" variant="ghost" color="neutral" icon="i-lucide-pencil" class="opacity-0 group-hover:opacity-100 self-start" @click="edit" />
    </div>
  </UCard>
</template>
