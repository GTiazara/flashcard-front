<script setup lang="ts">
import { computed, ref, watch } from 'vue'
const props = defineProps<{ name: string; url?: string }>()
const failed = ref(false)
watch(() => props.url, () => { failed.value = false })
const initials = computed(() => props.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'M')
const safeUrl = computed(() => /^https?:\/\//i.test(props.url || '') ? props.url : undefined)
</script>
<template><span class="avatar"><img v-if="safeUrl && !failed" :src="safeUrl" alt="" loading="lazy" referrerpolicy="no-referrer" @error="failed = true" /><span v-else>{{ initials }}</span></span></template>