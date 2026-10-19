<script setup lang="ts">
import { httpImage, publicConfig } from '../lib/config'
import UiField from './UiField.vue'
withDefaults(defineProps<{
  card: { front: string; back: string; frontImageUrl: string; backImageUrl: string }
  index: number
  error?: string
  showImages?: boolean
  simpleLabels?: boolean
}>(), { showImages: true, simpleLabels: false })
</script>
<template>
  <div class="form-grid">
    <UiField v-model="card.front" :name="`front-${index}`" :label="simpleLabels ? 'Question' : `Question ${index + 1}`" multiline :maxlength="publicConfig.cardTextMaxLength" placeholder="Une question claire et précise…" :error="error" />
    <UiField v-model="card.back" :name="`back-${index}`" :label="simpleLabels ? 'Réponse' : `Réponse ${index + 1}`" multiline :maxlength="publicConfig.cardTextMaxLength" placeholder="L’essentiel à retenir…" :error="error" />
    <UiField v-if="showImages" v-model="card.frontImageUrl" :name="`front-image-${index}`" :label="simpleLabels ? 'Image de la question' : `Image de la question ${index + 1}`" maxlength="2048" placeholder="https://…" hint="Facultatif. Adresse HTTP(S) d’une image." :error="error" />
    <UiField v-if="showImages" v-model="card.backImageUrl" :name="`back-image-${index}`" :label="simpleLabels ? 'Image de la réponse' : `Image de la réponse ${index + 1}`" maxlength="2048" placeholder="https://…" hint="Facultatif. Adresse HTTP(S) d’une image." :error="error" />
  </div>
  <div v-if="httpImage(card.frontImageUrl) || httpImage(card.backImageUrl)" class="form-grid editor-previews">
    <img v-if="httpImage(card.frontImageUrl)" class="editor-face-image" :src="httpImage(card.frontImageUrl)" alt="" loading="lazy" referrerpolicy="no-referrer" />
    <img v-if="httpImage(card.backImageUrl)" class="editor-face-image" :src="httpImage(card.backImageUrl)" alt="" loading="lazy" referrerpolicy="no-referrer" />
  </div>
  <small>{{ card.front.length }} / {{ publicConfig.cardTextMaxLength }} · {{ card.back.length }} / {{ publicConfig.cardTextMaxLength }} caractères</small>
</template>
