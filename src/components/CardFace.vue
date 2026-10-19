<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { httpImage } from '../lib/config'
const props = defineProps<{ label: string; text?: string; imageUrl?: string }>()
const failed = ref(false)
watch(() => props.imageUrl, () => { failed.value = false })
const safeUrl = computed(() => httpImage(props.imageUrl))
const caption = computed(() => props.text?.trim() ?? '')
</script>
<template>
  <span class="face-label">{{ label }}</span>
  <span class="face-content">
    <img v-if="safeUrl && !failed" class="face-image" :src="safeUrl" :alt="caption ? '' : label" loading="lazy" referrerpolicy="no-referrer" @error="failed = true" />
    <span v-if="caption" class="text-pre">{{ caption }}</span>
    <span v-else-if="!safeUrl || failed" class="face-fallback">Image indisponible</span>
  </span>
</template>
