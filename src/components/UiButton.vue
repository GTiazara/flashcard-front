<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; busy?: boolean; type?: 'button' | 'submit' | 'reset' }>(), { variant: 'primary', type: 'button' })
</script>
<template><button :type="type" class="btn" :class="`btn-${variant}`" :disabled="busy" :aria-busy="busy || undefined"><span v-if="busy" class="spinner small" aria-hidden="true"></span><slot /></button></template>