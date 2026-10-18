<script setup lang="ts">
import { Layers3 } from 'lucide-vue-next'
defineProps<{ title: string; description: string }>()
</script>
<template><section class="empty surface"><div class="empty-icon"><Layers3 :size="30" /></div><h2>{{ title }}</h2><p>{{ description }}</p><div class="actions"><slot /></div></section></template>