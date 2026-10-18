<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCw, Check, Clock3, Layers3, Trophy } from 'lucide-vue-next'
import { api, errorMessage } from '../lib/api'
import { auth } from '../lib/auth'
import { moveReview, newReview, reviewPayload } from '../lib/review'
import type { Deck } from '../types'
import UiButton from '../components/UiButton.vue'
import EmptyState from '../components/EmptyState.vue'
import LoadState from '../components/LoadState.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
const route = useRoute(), deck = ref<Deck | null>(null), busy = ref(true), error = ref(''), started = ref(false), finished = ref(false), quitOpen = ref(false)
const state = reactive(newReview()), payload = ref<{ cardsVisited: number; durationSeconds: number } | null>(null), saveState = ref<'idle'|'saving'|'saved'|'failed'>('idle'), saveError = ref('')
const card = computed(() => deck.value?.cards?.[state.index]), length = computed(() => deck.value?.cards?.length || 0)
const active = computed(() => started.value && !finished.value)
let savePromise: Promise<void> | null = null
async function load() { busy.value = true; error.value = ''; try { deck.value = await api<Deck>(`/decks/${route.params.id}`) } catch (err) { error.value = errorMessage(err) } finally { busy.value = false } }
function start() { if (!length.value) return; Object.assign(state, newReview()); started.value = true }
function move(delta: number) { moveReview(state, delta, length.value) }
function flip() { state.flipped = !state.flipped }
async function saveSession() {
  if (savePromise || saveState.value === 'saved' || !payload.value || !deck.value) return
  saveState.value = 'saving'; saveError.value = ''
  savePromise = api(`/decks/${deck.value._id}/study-sessions`, 'POST', payload.value)
    .then(() => { saveState.value = 'saved' })
    .catch(err => { saveState.value = 'failed'; saveError.value = `${errorMessage(err)} Une réponse perdue peut avoir laissé une session enregistrée. Vérifiez l’historique avant de réessayer.` })
    .finally(() => { savePromise = null })
  await savePromise
}
function finish() { if (!active.value) return; payload.value = reviewPayload(state); finished.value = true; quitOpen.value = false; void saveSession() }
function keyboard(event: KeyboardEvent) {
  if (!active.value || quitOpen.value || event.altKey || event.ctrlKey || event.metaKey) return
  const target = event.target as HTMLElement | null
  if (target?.closest('input,textarea,select,[contenteditable="true"],button,a,[role="button"]')) return
  if (event.code === 'Space') { event.preventDefault(); flip() }
  if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
  if (event.key === 'ArrowRight') { event.preventDefault(); move(1) }
}
function beforeUnload(event: BeforeUnloadEvent) { if (active.value || saveState.value === 'failed' || saveState.value === 'saving') { event.preventDefault(); event.returnValue = '' } }
onBeforeRouteLeave(() => {
  if (!auth.user) return true
  if (saveState.value === 'saving') return window.confirm('L’enregistrement est en cours. Quitter maintenant peut interrompre la confirmation de la session. Continuer ?')
  if (active.value) return window.confirm('Quitter cette révision sans enregistrer de session ? Pour conserver le résumé, choisissez « Terminer » avant de partir.')
  if (saveState.value === 'failed') return window.confirm('La session n’a pas été confirmée par le serveur. Quitter abandonnera le résumé local. Continuer ?')
  return true
})
onMounted(() => { void load(); document.addEventListener('keydown', keyboard); window.addEventListener('beforeunload', beforeUnload) })
onUnmounted(() => { document.removeEventListener('keydown', keyboard); window.removeEventListener('beforeunload', beforeUnload) })
</script>
<template><div class="narrow review-view"><RouterLink to="/study" class="back-link"><ArrowLeft :size="16" />Mes révisions</RouterLink><LoadState :busy="busy" :error="error" @retry="load" /><template v-if="deck && !error"><div class="page-heading"><p class="eyebrow">PRENEZ LE TEMPS DE COMPRENDRE</p><h1>{{ deck.title }}</h1><p>{{ finished ? 'Un pas de plus. Et c’est déjà beaucoup.' : 'La curiosité fait le reste.' }}</p></div><EmptyState v-if="!length" title="Pas de carte, pas de précipitation." description="Ce paquet ne contient aucune carte. Aucune session ne sera démarrée."><RouterLink :to="`/decks/${deck._id}`" class="btn btn-secondary">Retour au paquet</RouterLink></EmptyState><section v-else-if="!started" class="surface panel start-review"><span class="review-symbol"><Layers3 :size="38" /></span><h2>Un petit rendez-vous avec vos idées.</h2><p>{{ length }} cartes à parcourir, sans chronomètre imposé et sans score.</p><UiButton @click="start">Commencer la révision <ChevronRight :size="17" /></UiButton></section><template v-else-if="active"><div class="between review-progress-text"><span>Carte {{ state.index + 1 }} sur {{ length }}</span><span>{{ state.visited.size }} carte{{ state.visited.size > 1 ? 's' : '' }} parcourue{{ state.visited.size > 1 ? 's' : '' }}</span></div><progress :value="state.index+1" :max="length" aria-label="Progression dans les cartes"></progress><button class="flashcard review-card" :aria-pressed="state.flipped" aria-label="Retourner la carte" @click="flip"><span class="face-label">{{ state.flipped ? 'Réponse' : 'Question' }}</span><span class="face-content">{{ state.flipped ? card?.back : card?.front }}</span><span class="flip-hint"><RotateCw :size="15" />Cliquer pour retourner</span></button><div class="review-controls"><UiButton variant="secondary" :disabled="state.index === 0" @click="move(-1)"><ChevronLeft :size="18" />Précédente</UiButton><UiButton variant="secondary" @click="flip"><RotateCw :size="16" />Retourner</UiButton><UiButton v-if="state.index < length-1" @click="move(1)">Suivante<ChevronRight :size="18" /></UiButton><UiButton v-else @click="finish">Terminer<Check :size="18" /></UiButton></div><p class="keyboard-hint">Au clavier, hors des boutons : Espace pour retourner · ← → pour naviguer</p><UiButton variant="ghost" class="quit-review" @click="quitOpen = true">Terminer cette session maintenant</UiButton></template><section v-else-if="finished && payload" class="surface panel summary"><span class="review-symbol"><Trophy :size="35" /></span><p class="eyebrow">LE PLAISIR D’AVANCER</p><h2>Un moment bien investi.</h2><p>Vous avez pris le temps de faire vivre vos connaissances.</p><div class="summary-stats"><div><Layers3 :size="22" /><strong>{{ payload.cardsVisited }}</strong><span>cartes uniques parcourues</span></div><div><Clock3 :size="22" /><strong>{{ payload.durationSeconds < 60 ? `${payload.durationSeconds} s` : `${Math.round(payload.durationSeconds / 60)} min` }}</strong><span>durée approximative</span></div></div><p class="subtle">Ce résumé décrit votre parcours, pas votre maîtrise des cartes.</p><p v-if="saveState === 'saved'" class="notice success" role="status"><Check :size="16" />Session enregistrée dans votre historique.</p><p v-else-if="saveState === 'saving'" class="loading" role="status"><span class="spinner"></span>Enregistrement de la session…</p><div v-else-if="saveState === 'failed'" class="alert" role="alert"><p>{{ saveError }}</p><UiButton variant="secondary" @click="saveSession">Réessayer l’enregistrement</UiButton></div><div class="actions"><RouterLink to="/study" class="btn btn-primary">Retour aux révisions</RouterLink><RouterLink :to="`/decks/${deck._id}`" class="btn btn-secondary">Voir le paquet</RouterLink></div></section></template><ConfirmDialog :open="quitOpen" title="Terminer cette session ?" message="Les cartes déjà parcourues et la durée approximative seront enregistrées. Vous pourrez revenir réviser quand vous le souhaitez." @cancel="quitOpen = false" @confirm="finish" /></div></template>
<style scoped>.start-review,.summary{text-align:center;padding:45px 30px}.review-symbol{display:inline-grid;place-items:center;color:#9b80c6;background:#f0e9fa;border-radius:24px;padding:23px;margin-bottom:24px}.start-review h2,.summary h2{font-size:27px}.start-review p,.summary>p:not(.eyebrow){color:var(--muted);font-size:13px;margin:15px auto 25px;max-width:490px}.review-progress-text{font-size:12px;color:#8d7ca4;margin-bottom:12px}progress{display:block;width:100%;height:5px;border:0;border-radius:20px;background:#e8e0f3;margin-bottom:25px}progress::-webkit-progress-bar{background:#e8e0f3;border-radius:20px}progress::-webkit-progress-value{background:#9e87d0;border-radius:20px}progress::-moz-progress-bar{background:#9e87d0;border-radius:20px}.review-card{min-height:350px;background:white;box-shadow:0 10px 40px #644c9c08}.review-card .face-content{font-family:Georgia,serif;font-size:30px}.review-controls{display:flex;gap:10px;justify-content:space-between;margin-top:25px}.keyboard-hint{text-align:center;color:#a095ad;font-size:10px;margin-top:25px}.quit-review{display:flex;margin:22px auto}.summary-stats{display:grid;grid-template-columns:1fr 1fr;max-width:480px;margin:30px auto;gap:20px}.summary-stats>div{display:grid;justify-items:center;gap:8px;padding:22px 15px;border:1px solid var(--border);border-radius:17px;color:#947db7}.summary-stats strong{font-size:30px;color:#58476c}.summary-stats span{font-size:10px}.summary .actions{justify-content:center;margin-top:24px}.summary .success{display:flex;align-items:center;justify-content:center;gap:8px}.summary .alert .btn{margin-top:12px}@media(max-width:600px){.review-card{min-height:320px}.review-card .face-content{font-size:25px}.review-controls{flex-wrap:wrap;gap:8px}.review-controls .btn{font-size:11px;padding:9px 12px}.keyboard-hint{display:none}.summary,.start-review{padding:30px 20px}.summary-stats{gap:12px}.summary-stats>div{padding:18px 10px}.summary-stats span{font-size:9px}}</style>