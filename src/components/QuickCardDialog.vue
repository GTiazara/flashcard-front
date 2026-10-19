<script setup lang="ts">
import { nextTick, reactive, ref, watch } from 'vue'
import { Image, Layers3, Sparkles, X } from 'lucide-vue-next'
import { api, errorMessage } from '../lib/api'
import { allPages } from '../lib/pagination'
import { cardTextError } from '../lib/config'
import type { Card, Deck } from '../types'
import CardFields from './CardFields.vue'
import UiButton from './UiButton.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; saved: [message: string] }>()
const dialog = ref<HTMLDialogElement>()
const decks = ref<Deck[]>([])
const destination = ref('')
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const cardError = ref('')
const showImages = ref(false)
const card = reactive({ key: 'quick', front: '', back: '', frontImageUrl: '', backImageUrl: '' })
let previous: HTMLElement | null = null

function reset() {
  Object.assign(card, { front: '', back: '', frontImageUrl: '', backImageUrl: '' })
  destination.value = ''
  error.value = ''
  cardError.value = ''
  showImages.value = false
}
async function loadDecks() {
  loading.value = true
  try { decks.value = await allPages<Deck>('/decks') }
  catch (err) { error.value = errorMessage(err) }
  finally { loading.value = false }
}
function close() {
  if (saving.value) return
  emit('close')
}
async function save() {
  cardError.value = cardTextError(card.front, card.back, card.frontImageUrl, card.backImageUrl)
  if (cardError.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    const result = await api<{ card: Card; deck: { _id: string; title: string } }>('/cards/quick', 'POST', {
      front: card.front,
      back: card.back,
      frontImageUrl: card.frontImageUrl,
      backImageUrl: card.backImageUrl,
      ...(destination.value ? { deck: destination.value } : {}),
    })
    emit('saved', `Carte ajoutée au paquet « ${result.deck.title} ».`)
    reset()
    emit('close')
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    saving.value = false
  }
}
watch(() => props.open, async open => {
  await nextTick()
  if (open) {
    previous = document.activeElement as HTMLElement | null
    reset()
    dialog.value?.showModal()
    await nextTick()
    dialog.value?.querySelector<HTMLTextAreaElement>('textarea')?.focus()
    void loadDecks()
  } else {
    dialog.value?.close()
    previous?.focus()
  }
}, { immediate: true })
</script>

<template>
  <dialog ref="dialog" class="quick-card-dialog" aria-labelledby="quick-card-title" @cancel.prevent="close">
    <form class="quick-card-form" @submit.prevent="save" @keydown.ctrl.enter.prevent="save" @keydown.meta.enter.prevent="save">
      <header>
        <span class="quick-symbol"><Sparkles :size="22" /></span>
        <div><p class="eyebrow">SAISIE RAPIDE</p><h2 id="quick-card-title">Créer une flashcard</h2><p>Une question, une réponse, c’est tout.</p></div>
        <button type="button" class="icon-button" aria-label="Fermer" :disabled="saving" @click="close"><X :size="18" /></button>
      </header>
      <p v-if="error" class="alert" role="alert">{{ error }}</p>
      <div class="destination">
        <label for="quick-destination"><Layers3 :size="16" /> Ranger dans</label>
        <select id="quick-destination" v-model="destination" :disabled="loading">
          <option value="">Général — paquet automatique</option>
          <option v-for="deck in decks" :key="deck._id" :value="deck._id">{{ deck.title }}</option>
        </select>
        <small>Sans choix, Mnemo crée une seule fois votre paquet privé « Général ».</small>
      </div>
      <CardFields :card="card" :index="0" :error="cardError" :show-images="showImages" simple-labels />
      <button type="button" class="image-toggle" :aria-expanded="showImages" @click="showImages = !showImages"><Image :size="16" />{{ showImages ? 'Masquer les images' : 'Ajouter des images (facultatif)' }}</button>
      <footer>
        <span class="keyboard-hint">Astuce : Ctrl + Entrée pour enregistrer</span>
        <div class="actions"><UiButton variant="secondary" :disabled="saving" @click="close">Annuler</UiButton><UiButton type="submit" :busy="saving">Ajouter la carte</UiButton></div>
      </footer>
    </form>
  </dialog>
</template>

<style scoped>
.quick-card-dialog{border:0;border-radius:24px;padding:0;width:min(680px,calc(100% - 28px));max-height:calc(100dvh - 28px);margin:auto;overflow:auto;color:inherit;box-shadow:0 26px 90px #211a3a38}
.quick-card-dialog::backdrop{background:#211a3a80;backdrop-filter:blur(5px)}
.quick-card-form{display:grid;gap:20px;padding:27px}
header{display:grid;grid-template-columns:auto 1fr auto;align-items:start;gap:14px}
header h2{font-size:25px}header p:not(.eyebrow){color:var(--muted);font-size:12px;margin-top:4px}
.quick-symbol{display:grid;place-items:center;width:46px;height:46px;border-radius:14px;color:#6c5ce7;background:#f0edff}
.destination{display:grid;gap:7px;padding:15px;border:1px solid #e4def5;border-radius:14px;background:#faf8ff}
.destination label{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700;color:#6254a7}
.destination select{background:white}.destination small{font-size:10px}
.image-toggle{justify-self:start;border:0;background:transparent;color:#6254c1;display:flex;align-items:center;gap:7px;padding:3px;font-size:12px}
footer{display:flex;align-items:center;justify-content:space-between;gap:14px;border-top:1px solid var(--border);padding-top:18px}
.keyboard-hint{font-size:10px;color:var(--muted)}
@media(max-width:600px){.quick-card-form{padding:20px}.quick-symbol{display:none}header{grid-template-columns:1fr auto}footer{align-items:stretch;flex-direction:column}.keyboard-hint{display:none}footer .actions{justify-content:flex-end}}
</style>
