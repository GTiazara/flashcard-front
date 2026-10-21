<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCw, Check, Clock3, Layers3, Trophy } from 'lucide-vue-next'
import { api, errorMessage } from '../lib/api'
import { auth } from '../lib/auth'
import { moveReview, newReview, reviewPayload, reviewScore, type Recall } from '../lib/review'
import type { Deck } from '../types'
import { getStaticPublication } from '../lib/static-content'
import UiButton from '../components/UiButton.vue'
import EmptyState from '../components/EmptyState.vue'
import LoadState from '../components/LoadState.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import CardFace from '../components/CardFace.vue'
import FlipCard from '../components/FlipCard.vue'
const route = useRoute(), deck = ref<Deck | null>(null), busy = ref(true), error = ref(''), started = ref(false), finished = ref(false), quitOpen = ref(false)
const staticSlug = computed(() => typeof route.params.slug === 'string' ? route.params.slug : '')
const isStatic = computed(() => Boolean(staticSlug.value))
const state = reactive(newReview()), payload = ref<ReturnType<typeof reviewPayload> | null>(null), saveState = ref<'idle'|'saving'|'saved'|'failed'>('idle'), saveError = ref(''), enter = ref<'next' | 'prev'>()
const score = computed(() => payload.value ? reviewScore({ known: payload.value.knownCount, doubt: payload.value.doubtCount, unknown: payload.value.unknownCount }) : null)
const card = computed(() => deck.value?.cards?.[state.index]), length = computed(() => deck.value?.cards?.length || 0)
const ratedCount = computed(() => Object.values(state.marks).length)
const active = computed(() => started.value && !finished.value)
let savePromise: Promise<void> | null = null
async function load() { busy.value = true; error.value = ''; try {
  if (isStatic.value) {
    const publication = getStaticPublication(staticSlug.value)
    if (!publication) throw new Error('Publication statique introuvable.')
    deck.value = publication
  } else deck.value = await api<Deck>(`/decks/${route.params.id}`)
} catch (err) { error.value = errorMessage(err) } finally { busy.value = false } }
function start() { if (!length.value) return; Object.assign(state, newReview()); started.value = true }
function focusStage() {
  const stage = document.querySelector('.review-stage')
  if (!stage || !window.matchMedia('(max-width: 767px)').matches) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  stage.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
}
watch(active, value => {
  if (value) document.body.dataset.focus = 'review'
  else delete document.body.dataset.focus
  if (value) void nextTick(focusStage)
}, { flush: 'post' })
watch(() => state.index, () => { if (active.value) void nextTick(focusStage) })
function move(delta: number) { enter.value = delta > 0 ? 'next' : 'prev'; moveReview(state, delta, length.value) }
function continueForward() { if (state.marks[state.index] !== undefined && state.index < length.value - 1) move(1) }
function flip() { state.flipped = !state.flipped }
function rate(mark: Recall) {
  const first = state.marks[state.index] === undefined
  state.marks[state.index] = mark
  if (first && state.index < length.value - 1) move(1)
}
async function saveSession() {
  if (isStatic.value) return
  if (savePromise || saveState.value === 'saved' || !payload.value || !deck.value) return
  saveState.value = 'saving'; saveError.value = ''
  savePromise = api(`/decks/${deck.value._id}/study-sessions`, 'POST', payload.value)
    .then(() => { saveState.value = 'saved' })
    .catch(err => { saveState.value = 'failed'; saveError.value = `${errorMessage(err)} Une réponse perdue peut avoir laissé une session enregistrée. Vérifiez l’historique avant de réessayer.` })
    .finally(() => { savePromise = null })
  await savePromise
}
function finish() { if (!active.value) return; payload.value = reviewPayload(state); finished.value = true; quitOpen.value = false; if (!isStatic.value) void saveSession() }
function keyboard(event: KeyboardEvent) {
  if (!active.value || quitOpen.value || event.altKey || event.ctrlKey || event.metaKey) return
  const target = event.target as HTMLElement | null
  if (target?.closest('input,textarea,select,[contenteditable="true"],button,a,[role="button"]')) return
  if (event.code === 'Space') { event.preventDefault(); flip() }
  if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
  if (event.key === 'ArrowRight') { event.preventDefault(); continueForward() }
  if (event.code === 'Digit1' || event.code === 'Numpad1') { event.preventDefault(); rate('unknown') }
  if (event.code === 'Digit2' || event.code === 'Numpad2') { event.preventDefault(); rate('doubt') }
  if (event.code === 'Digit3' || event.code === 'Numpad3') { event.preventDefault(); rate('known') }
}
function beforeUnload(event: BeforeUnloadEvent) { if (active.value || saveState.value === 'failed' || saveState.value === 'saving') { event.preventDefault(); event.returnValue = '' } }
onBeforeRouteLeave(() => {
  if (!auth.user) return true
  if (saveState.value === 'saving') return window.confirm('L’enregistrement est en cours. Quitter maintenant peut interrompre la confirmation de la session. Continuer ?')
  if (active.value) return window.confirm(isStatic.value ? 'Quitter cette révision sans afficher son résumé ?' : 'Quitter cette révision sans enregistrer de session ? Pour conserver le résumé, choisissez « Terminer » avant de partir.')
  if (saveState.value === 'failed') return window.confirm('La session n’a pas été confirmée par le serveur. Quitter abandonnera le résumé local. Continuer ?')
  return true
})
onMounted(() => { void load(); document.addEventListener('keydown', keyboard); window.addEventListener('beforeunload', beforeUnload) })
onUnmounted(() => { delete document.body.dataset.focus; document.removeEventListener('keydown', keyboard); window.removeEventListener('beforeunload', beforeUnload) })
</script>
<template><div class="narrow review-view"><RouterLink :to="isStatic ? `/static/${staticSlug}` : '/study'" class="back-link"><ArrowLeft :size="16" />{{ isStatic ? 'Retour au paquet' : 'Mes révisions' }}</RouterLink><LoadState :busy="busy" :error="error" @retry="load" /><template v-if="deck && !error"><div class="page-heading"><p class="eyebrow">PRENEZ LE TEMPS DE COMPRENDRE</p><h1>{{ deck.title }}</h1><p>{{ finished ? 'Un pas de plus. Et c’est déjà beaucoup.' : 'La curiosité fait le reste.' }}</p></div><EmptyState v-if="!length" title="Pas de carte, pas de précipitation." description="Ce paquet ne contient aucune carte. Aucune session ne sera démarrée."><RouterLink :to="isStatic ? `/static/${staticSlug}` : `/decks/${deck._id}`" class="btn btn-secondary">Retour au paquet</RouterLink></EmptyState><section v-else-if="!started" class="surface panel start-review"><span class="review-symbol"><Layers3 :size="38" /></span><h2>Un petit rendez-vous avec vos idées.</h2><p>{{ length }} cartes à parcourir, sans chronomètre. Après la réponse, indiquez si vous la connaissez.</p><UiButton @click="start">Commencer la révision <ChevronRight :size="17" /></UiButton></section><template v-else-if="active"><div class="review-stage"><div class="between review-progress-text"><span>Carte {{ state.index + 1 }} sur {{ length }}</span><span>{{ ratedCount }} repère{{ ratedCount > 1 ? 's' : '' }}</span></div><progress :value="state.index+1" :max="length" aria-label="Progression dans les cartes"></progress><FlipCard :key="state.index" class="review-card" tone="review" :flipped="state.flipped" :enter="enter" label="Retourner la carte" hint="Cliquer pour retourner" @flip="flip"><template #front><CardFace label="Question" :text="card?.front" :image-url="card?.frontImageUrl" /></template><template #back><CardFace label="Réponse" :text="card?.back" :image-url="card?.backImageUrl" /></template></FlipCard><div class="recall" role="group" aria-label="Votre repère sur cette carte"><button type="button" class="recall-unknown" :aria-pressed="state.marks[state.index] === 'unknown'" @click="rate('unknown')">Je ne connais pas</button><button type="button" class="recall-doubt" :aria-pressed="state.marks[state.index] === 'doubt'" @click="rate('doubt')">J'ai un doute</button><button type="button" class="recall-known" :aria-pressed="state.marks[state.index] === 'known'" @click="rate('known')">Je connais</button></div><div class="review-controls"><UiButton variant="secondary" :disabled="state.index === 0" @click="move(-1)"><ChevronLeft :size="18" />Précédente</UiButton><UiButton variant="secondary" @click="flip"><RotateCw :size="16" />Retourner</UiButton><UiButton v-if="state.marks[state.index] && state.index < length-1" @click="continueForward">Continuer<ChevronRight :size="18" /></UiButton><UiButton v-else-if="state.index === length-1" @click="finish">Terminer<Check :size="18" /></UiButton></div><p class="keyboard-hint">Au clavier, hors des boutons : Espace pour retourner · ← pour revenir · 1 inconnu, 2 doute, 3 connu</p><UiButton variant="ghost" class="quit-review" @click="quitOpen = true">Terminer cette session maintenant</UiButton></div></template><section v-else-if="finished && payload" class="surface panel summary"><span class="review-symbol"><Trophy :size="35" /></span><p class="eyebrow">LE PLAISIR D’AVANCER</p><h2>Un moment bien investi.</h2><p>Vous avez pris le temps de faire vivre vos connaissances.</p><p v-if="score?.percent !== null && score" class="recall-score"><strong>{{ score.percent }} %</strong><span>selon vos repères · {{ score.known }} connue{{ score.known > 1 ? 's' : '' }}, {{ score.doubt }} doute{{ score.doubt > 1 ? 's' : '' }}, {{ score.unknown }} inconnue{{ score.unknown > 1 ? 's' : '' }}</span></p><p v-else class="subtle">Aucune carte annotée : le taux n'est pas calculé.</p><div class="summary-stats"><div><Layers3 :size="22" /><strong>{{ payload.cardsVisited }}</strong><span>cartes uniques parcourues</span></div><div><Clock3 :size="22" /><strong>{{ payload.durationSeconds < 60 ? `${payload.durationSeconds} s` : `${Math.round(payload.durationSeconds / 60)} min` }}</strong><span>durée approximative</span></div></div><p class="subtle">Connu compte 1, le doute 0,5 et inconnu 0. Ce taux reprend vos repères, sans certifier une maîtrise.</p><p v-if="isStatic" class="notice" role="status">Résumé temporaire : il ne sera pas conservé après avoir quitté cette page.</p><p v-else-if="saveState === 'saved'" class="notice success" role="status"><Check :size="16" />Session enregistrée dans votre historique.</p><p v-else-if="saveState === 'saving'" class="loading" role="status"><span class="spinner"></span>Enregistrement de la session…</p><div v-else-if="!isStatic && saveState === 'failed'" class="alert" role="alert"><p>{{ saveError }}</p><UiButton variant="secondary" @click="saveSession">Réessayer l’enregistrement</UiButton></div><div class="actions"><RouterLink to="/study" class="btn btn-primary">Retour aux révisions</RouterLink><RouterLink :to="isStatic ? `/static/${staticSlug}` : `/decks/${deck._id}`" class="btn btn-secondary">Voir le paquet</RouterLink></div></section></template><ConfirmDialog :open="quitOpen" title="Terminer cette session ?" :message="isStatic ? 'Votre résumé sera affiché à la fin, mais ne sera pas conservé après avoir quitté cette page.' : 'Les cartes parcourues, la durée et vos repères (connu, doute, inconnu) seront enregistrés. Vous pourrez revenir réviser quand vous le souhaitez.'" @cancel="quitOpen = false" @confirm="finish" /></div></template>
<style scoped>.start-review,.summary{text-align:center;padding:45px 30px}.review-symbol{display:inline-grid;place-items:center;color:#9b80c6;background:#f0e9fa;border-radius:24px;padding:23px;margin-bottom:24px}.start-review h2,.summary h2{font-size:27px}.start-review p,.summary>p:not(.eyebrow){color:var(--muted);font-size:13px;margin:15px auto 25px;max-width:490px}.review-progress-text{font-size:12px;color:#8d7ca4;margin-bottom:12px}progress{display:block;width:100%;height:5px;border:0;border-radius:20px;background:#e8e0f3;margin-bottom:25px}progress::-webkit-progress-bar{background:#e8e0f3;border-radius:20px}progress::-webkit-progress-value{background:#9e87d0;border-radius:20px}progress::-moz-progress-bar{background:#9e87d0;border-radius:20px}.recall{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:18px}.recall button{min-height:48px;border-radius:12px;border:1px solid transparent;font-size:13px;font-weight:700;padding:10px 8px}.recall button[aria-pressed=true]{box-shadow:0 0 0 3px #ffffff,0 0 0 5px currentColor}.recall-unknown{color:#9d2f42;background:#fff1f3;border-color:#f0c7cf}.recall-doubt{color:#9a5b12;background:#fff6ea;border-color:#f0d7b4}.recall-known{color:#1f7a52;background:#eaf8f1;border-color:#c6ead8}.review-controls{display:flex;gap:10px;justify-content:space-between;margin-top:16px}.recall-score{display:grid;justify-items:center;gap:6px;margin:8px auto 4px}.recall-score strong{font-size:42px;letter-spacing:-1px;color:#3f6d52}.recall-score span{font-size:12px;color:var(--muted)}.keyboard-hint{text-align:center;color:#a095ad;font-size:10px;margin-top:25px}.quit-review{display:flex;margin:22px auto}.summary-stats{display:grid;grid-template-columns:1fr 1fr;max-width:480px;margin:30px auto;gap:20px}.summary-stats>div{display:grid;justify-items:center;gap:8px;padding:22px 15px;border:1px solid var(--border);border-radius:17px;color:#947db7}.summary-stats strong{font-size:30px;color:#58476c}.summary-stats span{font-size:10px}.summary .actions{justify-content:center;margin-top:24px}.summary .success{display:flex;align-items:center;justify-content:center;gap:8px}.summary .alert .btn{margin-top:12px}@media(max-width:600px){.recall{grid-template-columns:1fr}.recall-score strong{font-size:34px}.review-controls{flex-wrap:wrap;gap:8px}.review-controls .btn{font-size:11px;padding:9px 12px}.review-stage{scroll-margin-top:8px}.keyboard-hint{display:none}.summary,.start-review{padding:22px 16px}.start-review .review-symbol{display:none}.start-review h2{font-size:22px}.summary-stats{gap:12px}.summary-stats>div{padding:18px 10px}.summary-stats span{font-size:9px}}</style>
