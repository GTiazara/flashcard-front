<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import UiButton from './UiButton.vue'
const props = defineProps<{ open: boolean; title: string; message: string; busy?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const dialog = ref<HTMLDialogElement>()
let previous: HTMLElement | null = null
watch(() => props.open, async open => {
  await nextTick()
  if (open) { previous = document.activeElement as HTMLElement; dialog.value?.showModal() }
  else { dialog.value?.close(); previous?.focus() }
}, { immediate: true })
</script>
<template><dialog ref="dialog" class="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-description" @cancel.prevent="!busy && emit('cancel')"><div class="dialog-icon"><AlertTriangle /></div><h2 id="confirm-title">{{ title }}</h2><p id="confirm-description">{{ message }}</p><div class="actions end"><UiButton variant="secondary" :disabled="busy" autofocus @click="emit('cancel')">Annuler</UiButton><UiButton variant="danger" :busy="busy" @click="emit('confirm')">Confirmer</UiButton></div></dialog></template>