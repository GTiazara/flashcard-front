<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{ label: string; name: string; error?: string; hint?: string; multiline?: boolean }>()
const value = defineModel<string | number>({ default: '' })
</script>
<template>
  <div class="field">
    <label :for="name">{{ label }}</label>
    <textarea v-if="multiline" :id="name" v-model="value" v-bind="$attrs" :aria-invalid="!!error" :aria-describedby="error ? `${name}-error` : hint ? `${name}-hint` : undefined" />
    <input v-else :id="name" v-model="value" v-bind="$attrs" :aria-invalid="!!error" :aria-describedby="error ? `${name}-error` : hint ? `${name}-hint` : undefined" />
    <small v-if="error" :id="`${name}-error`" class="field-error">{{ error }}</small>
    <small v-else-if="hint" :id="`${name}-hint`">{{ hint }}</small>
  </div>
</template>