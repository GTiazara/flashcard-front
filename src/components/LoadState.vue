<script setup lang="ts">
import UiButton from './UiButton.vue'
defineProps<{ busy?: boolean; error?: string; more?: boolean }>()
defineEmits<{ retry: []; more: [] }>()
</script>
<template><div class="load-state" aria-live="polite"><p v-if="error" class="alert" role="alert">{{ error }} <UiButton variant="ghost" @click="$emit('retry')">Réessayer</UiButton></p><p v-else-if="busy" class="loading"><span class="spinner"></span> Chargement…</p><UiButton v-else-if="more" variant="secondary" @click="$emit('more')">Charger plus</UiButton></div></template>