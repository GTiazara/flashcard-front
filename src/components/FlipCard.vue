<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { RotateCw } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  flipped: boolean
  label: string
  hint: string
  tone?: 'deck' | 'review' | 'feed'
  enter?: 'next' | 'prev'
}>(), { tone: 'deck' })

const emit = defineEmits<{ flip: [] }>()
const spinning = ref(false)
const settled = ref(props.flipped)
let ticket = 0
const FLIP_MS = 780

watch(() => props.flipped, value => {
  const mine = ++ticket
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    settled.value = value
    spinning.value = false
    return
  }
  spinning.value = true
  window.setTimeout(() => {
    if (mine !== ticket) return
    settled.value = value
    spinning.value = false
  }, FLIP_MS)
})

onUnmounted(() => { ticket += 1 })
</script>

<template>
  <button type="button" class="flip-scene" :class="[enter && `enter-${enter}`, `tone-${tone}`, { spinning, flipped }]" :aria-pressed="flipped" :aria-label="label" @click="emit('flip')">
    <span class="flip-lift">
      <span class="flip-rotor">
        <span class="flashcard flip-face flip-front" :class="{ concealed: !spinning && settled }" :aria-hidden="!spinning && settled">
          <slot name="front" />
          <span class="flip-hint"><RotateCw :size="tone === 'feed' ? 13 : 14" />{{ hint }}</span>
        </span>
        <span class="flashcard flip-face flip-back" :class="{ concealed: !spinning && !settled }" :aria-hidden="!spinning && !settled">
          <slot name="back" />
          <span class="flip-hint"><RotateCw :size="tone === 'feed' ? 13 : 14" />{{ hint }}</span>
        </span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.flip-scene {
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  perspective: 1400px;
  animation: card-fade .46s cubic-bezier(.16, .84, .32, 1);
}
.flip-scene.enter-next { animation-name: card-next; }
.flip-scene.enter-prev { animation-name: card-prev; }
.flip-lift { display: grid; }
.flip-scene.spinning .flip-lift { animation: card-lift .78s cubic-bezier(.45, .05, .25, 1); }
.flip-scene.spinning::after {
  content: '';
  position: absolute;
  left: 14%;
  right: 14%;
  bottom: 8px;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(ellipse, #5c4a8a38, transparent 70%);
  animation: card-shadow .78s ease;
  pointer-events: none;
}
.flip-scene { position: relative; }
.flip-rotor {
  display: grid;
  transform: rotateY(0deg);
  transform-style: preserve-3d;
  transition: transform .78s cubic-bezier(.55, .08, .25, 1);
}
.flipped .flip-rotor { transform: rotateY(180deg); }
.flip-face {
  grid-area: 1 / 1;
  position: relative;
  overflow: hidden;
  backface-visibility: hidden;
  box-shadow: 0 14px 34px #5c469414;
  transition: box-shadow .78s;
}
.flip-front { transform: translateZ(1px); }
.flip-back {
  transform: rotateY(180deg) translateZ(1px);
  background: linear-gradient(145deg, #f7f3ff, #ece5ff);
  border-color: #ddd4f6;
}
.flip-face::before {
  content: '';
  position: absolute;
  top: 0;
  left: 22px;
  right: 22px;
  height: 4px;
  border-radius: 0 0 8px 8px;
  background: linear-gradient(90deg, #8d7cf0, #6c5ce7);
}
.flip-back::before { background: linear-gradient(90deg, #49b08a, #2f8f6d); }
.flip-scene.spinning .flip-face::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 32%, #ffffff99 50%, transparent 68%);
  transform: translateX(-130%);
  animation: card-sheen .78s ease;
  pointer-events: none;
}
.concealed { visibility: hidden; }
.tone-review .flip-face { min-height: 350px; background: white; }
.tone-review .flip-back { background: linear-gradient(160deg, #fffcff, #f4efff); }
.tone-review :deep(.face-content) { font-family: Georgia, serif; font-size: 30px; }
.tone-feed .flip-face { min-height: 220px; }
.tone-feed :deep(.face-content) { font-family: Georgia, serif; font-size: 23px; }
@keyframes card-lift {
  0%, 100% { transform: translateY(0) scale(1); }
  42% { transform: translateY(-14px) scale(1.035); }
}
@keyframes card-sheen { to { transform: translateX(130%); } }
@keyframes card-shadow {
  0%, 100% { transform: scaleX(1); opacity: .2; }
  50% { transform: scaleX(.55) translateY(10px); opacity: 1; }
}
@keyframes card-fade {
  from { opacity: 0; transform: translateY(12px) scale(.985); }
  to { opacity: 1; transform: none; }
}
@keyframes card-next {
  from { opacity: 0; transform: translateX(42px) rotate(1.4deg); }
  to { opacity: 1; transform: none; }
}
@keyframes card-prev {
  from { opacity: 0; transform: translateX(-42px) rotate(-1.4deg); }
  to { opacity: 1; transform: none; }
}
@media (max-width: 600px) {
  .tone-review .flip-face { min-height: 320px; }
  .tone-review :deep(.face-content) { font-size: 25px; }
}
@media (max-width: 520px) {
  .tone-feed :deep(.face-content) { font-size: 21px; }
}
</style>
