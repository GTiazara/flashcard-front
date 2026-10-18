<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Plus, ChevronUp, ChevronDown, Trash2, Save, ShieldCheck, RotateCcw } from 'lucide-vue-next'
import { api, ApiError, errorMessage, fieldErrors } from '../lib/api'
import { allPages } from '../lib/pagination'
import { auth } from '../lib/auth'
import { cardTextError, publicConfig } from '../lib/config'
import { ownerId, type Card, type Chapter, type Course, type Deck, type Visibility } from '../types'
import UiButton from '../components/UiButton.vue'
import UiField from '../components/UiField.vue'
import LoadState from '../components/LoadState.vue'
interface EditCard { _id?: string; key: string; front: string; back: string }
interface EditorData { title: string; description: string; subject: string; level: string; chapter: string; visibility: Visibility; coverUrl: string; cards: EditCard[] }
const route = useRoute(), router = useRouter(), id = ref(typeof route.params.id === 'string' ? route.params.id : '')
const userId = auth.user!._id
const draftKey = `mnemo:draft:${userId}:${id.value || 'new'}`
const model = reactive<EditorData>({ title: '', description: '', subject: '', level: '', chapter: '', visibility: 'private', coverUrl: '', cards: [] })
const courses = ref<Course[]>([]), chapters = ref<Chapter[]>([]), selectedCourse = ref(''), initial = ref(''), ready = ref(false)
const loading = ref(true), loadError = ref(''), saving = ref(false), error = ref(''), errors = ref<Record<string,string>>({}), success = ref(''), localError = ref(''), availableDraft = ref('')
const deletedIds = ref<string[]>([]), uncertainCard = ref<EditCard | null>(null), uncertainCreate = ref(false)
const knownDeckIds = ref<string[]>([])
let draftTimer: ReturnType<typeof setTimeout>, leaving = false
const serialize = () => JSON.stringify({ ...model, deletedIds: deletedIds.value, deckId: id.value, uncertainCreate: uncertainCreate.value, knownDeckIds: knownDeckIds.value, uncertainCardKey: uncertainCard.value?.key })
const dirty = computed(() => ready.value && serialize() !== initial.value)
const chapterOptions = computed(() => chapters.value.filter(chapter => chapter.course === selectedCourse.value))
function fill(deck: Deck) {
  Object.assign(model, { title: deck.title, description: deck.description || '', subject: deck.subject || '', level: deck.level || '', chapter: deck.chapter || '', visibility: deck.visibility, coverUrl: deck.coverUrl || '', cards: (deck.cards || []).map(card => ({ _id: card._id, key: card._id, front: card.front, back: card.back })) })
}
async function initialize() {
  loading.value = true; loadError.value = ''
  try {
    courses.value = await allPages<Course>('/courses')
    chapters.value = (await Promise.all(courses.value.map(course => allPages<Chapter>(`/courses/${course._id}/chapters`)))).flat()
    if (id.value) {
      const deck = await api<Deck>(`/decks/${id.value}`)
      if (ownerId(deck) !== userId) throw new Error('Vous ne pouvez pas modifier le paquet d’un autre créateur.')
      fill(deck)
    } else { model.chapter = typeof route.query.chapter === 'string' && chapters.value.some(c => c._id === route.query.chapter) ? route.query.chapter : '' }
    selectedCourse.value = chapters.value.find(chapter => chapter._id === model.chapter)?.course || ''
    initial.value = serialize(); ready.value = true
    try { availableDraft.value = localStorage.getItem(draftKey) || '' } catch { localError.value = 'Le stockage local est indisponible. Gardez cette page ouverte pour préserver vos modifications.' }
  } catch (err) { loadError.value = errorMessage(err) }
  finally { loading.value = false }
}
function persistDraft() {
  if (!ready.value) return
  try { if (dirty.value) localStorage.setItem(draftKey, serialize()); else localStorage.removeItem(draftKey) }
  catch { localError.value = 'Impossible de conserver le brouillon localement. Ne fermez pas cette page avant l’enregistrement.' }
}
watch(model, () => { if (!ready.value) return; clearTimeout(draftTimer); draftTimer = setTimeout(persistDraft, 500) }, { deep: true })
function recover() {
  try {
    const draft = JSON.parse(availableDraft.value) as EditorData & { deletedIds?: string[]; deckId?: string; uncertainCreate?: boolean; knownDeckIds?: string[]; uncertainCardKey?: string }
    if (typeof draft.title !== 'string' || !Array.isArray(draft.cards) || !draft.cards.every(c => typeof c.front === 'string' && typeof c.back === 'string')) throw new Error('Brouillon invalide.')
    if (draft.deckId) id.value = draft.deckId
    Object.assign(model, { title: draft.title, description: draft.description, subject: draft.subject, level: draft.level, chapter: draft.chapter, visibility: draft.visibility, coverUrl: draft.coverUrl || '', cards: draft.cards })
    deletedIds.value = draft.deletedIds || []; uncertainCreate.value = !!draft.uncertainCreate; knownDeckIds.value = draft.knownDeckIds || []; uncertainCard.value = model.cards.find(c => c.key === draft.uncertainCardKey) || null
    selectedCourse.value = chapters.value.find(c => c._id === model.chapter)?.course || ''; availableDraft.value = ''
  } catch { error.value = 'Ce brouillon ne peut pas être restauré. Vous pouvez le supprimer et repartir des données du serveur.' }
}
function discardDraft() { availableDraft.value = ''; try { localStorage.removeItem(draftKey) } catch { /* aucun secret stocké */ } }
function addCard() { model.cards.push({ key: crypto.randomUUID(), front: '', back: '' }) }
function removeCard(index: number) { const card = model.cards[index]; if (card?._id) deletedIds.value.push(card._id); model.cards.splice(index, 1); persistDraft() }
function move(index: number, delta: number) { const target = index + delta; if (!model.cards[target]) return; [model.cards[index], model.cards[target]] = [model.cards[target]!, model.cards[index]!] }
function validate() {
  errors.value = {}
  if (!model.title.trim()) errors.value.title = 'Donnez un titre à ce paquet.'
  if (model.visibility === 'public' && !model.cards.length) errors.value.visibility = 'Ajoutez au moins une carte avant de publier.'
  model.cards.forEach((card, i) => { const message = cardTextError(card.front, card.back); if (message) errors.value[`card-${i}`] = message })
  return !Object.keys(errors.value).length
}
async function save() {
  if (saving.value || !validate()) return
  saving.value = true; error.value = ''; success.value = ''
  try {
    if (uncertainCreate.value) {
      const matches = (await allPages<Deck>('/decks')).filter(deck => !knownDeckIds.value.includes(deck._id) && deck.title === model.title && (deck.description || '') === model.description)
      if (matches.length !== 1) throw new Error('Création précédente incertaine. Consultez votre bibliothèque et ouvrez le paquet existant, ou vérifiez qu’il n’a pas été créé avant de repartir d’un nouveau formulaire. Aucune nouvelle création automatique n’est effectuée.')
      id.value = matches[0]!._id; uncertainCreate.value = false
    }
    if (!id.value) {
      knownDeckIds.value = (await allPages<Deck>('/decks')).map(deck => deck._id)
      try {
        const created = await api<Deck>('/decks', 'POST', { title: model.title, description: model.description, visibility: 'private' })
        id.value = created._id
      } catch (err) { if (err instanceof ApiError && (err.status === 0 || err.status >= 500)) uncertainCreate.value = true; throw err }
    }
    const current = await api<Deck>(`/decks/${id.value}`)
    if (ownerId(current) !== userId) throw new Error('Ce paquet ne vous appartient pas.')
    if (uncertainCard.value) {
      const pending = uncertainCard.value
      const knownIds = new Set(model.cards.map(card => card._id).filter(Boolean))
      const candidates = (current.cards || []).filter(card => !knownIds.has(card._id) && card.front === pending.front && card.back === pending.back)
      if (candidates.length > 1) throw new Error('Plusieurs cartes correspondent à l’envoi incertain. Rechargez le paquet pour réconcilier le brouillon avant toute nouvelle création.')
      if (candidates[0]) pending._id = candidates[0]._id
      uncertainCard.value = null
    }
    await api(`/decks/${id.value}`, 'PATCH', { title: model.title, description: model.description, subject: model.subject, level: model.level, chapter: model.chapter || null, coverUrl: model.coverUrl, visibility: current.visibility === 'public' && model.cards.length ? 'public' : 'private' })
    for (const cardId of [...deletedIds.value]) {
      if (current.cards?.some(card => card._id === cardId)) await api(`/cards/${cardId}`, 'DELETE')
      deletedIds.value = deletedIds.value.filter(value => value !== cardId); persistDraft()
    }
    for (const [position, card] of model.cards.entries()) {
      if (card._id) await api(`/cards/${card._id}`, 'PATCH', { front: card.front, back: card.back })
      else {
        try { const created = await api<Card>(`/decks/${id.value}/cards`, 'POST', { front: card.front, back: card.back, position }); card._id = created._id }
        catch (err) { if (err instanceof ApiError && (err.status === 0 || err.status >= 500)) uncertainCard.value = card; throw err }
      }
      persistDraft()
    }
    await api(`/decks/${id.value}/cards/order`, 'PUT', { ids: model.cards.map(card => card._id) })
    await api(`/decks/${id.value}`, 'PATCH', { visibility: model.visibility })
    initial.value = serialize(); discardDraft(); success.value = 'Paquet enregistré. Vos cartes sont prêtes.'
  } catch (err) { error.value = errorMessage(err); errors.value = { ...errors.value, ...fieldErrors(err) }; persistDraft() }
  finally { saving.value = false }
}
function restore() {
  if (!window.confirm('Abandonner vos modifications locales ? Les étapes déjà enregistrées sur le serveur seront rechargées.')) return
  discardDraft(); leaving = true; void router.push(id.value ? `/decks/${id.value}` : '/library')
}
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value || saving.value) { persistDraft(); event.preventDefault(); event.returnValue = '' } }
onBeforeRouteLeave(() => { if (!auth.user || !dirty.value || leaving) return true; if (saving.value) return false; persistDraft(); return window.confirm('Quitter l’éditeur ? Vos modifications non enregistrées resteront dans un brouillon local sur cet appareil.') })
onMounted(() => { void initialize(); window.addEventListener('beforeunload', beforeUnload) })
onUnmounted(() => { clearTimeout(draftTimer); if (dirty.value && !leaving) persistDraft(); window.removeEventListener('beforeunload', beforeUnload) })
</script>
<template>
  <div class="narrow"><RouterLink to="/library" class="back-link"><ArrowLeft :size="16" />Ma bibliothèque</RouterLink><div class="page-heading"><p class="eyebrow">FAITES GRANDIR VOS IDÉES</p><h1>{{ route.params.id ? 'Les idées prennent forme.' : 'Une idée, puis une carte.' }}</h1><p>Un recto pour se questionner. Un verso pour comprendre.</p></div>
    <LoadState :busy="loading" :error="loadError" @retry="initialize" />
    <template v-if="ready && !loadError"><div v-if="availableDraft" class="notice draft-banner"><p>Un brouillon local a été retrouvé pour ce paquet.</p><div class="actions"><UiButton variant="secondary" @click="recover"><RotateCcw :size="15" />Restaurer le brouillon</UiButton><UiButton variant="ghost" @click="discardDraft">Ignorer</UiButton></div></div><p v-if="localError" class="notice">{{ localError }}</p><p v-if="error" class="alert" role="alert">{{ error }}</p><p v-if="success" class="notice success" role="status">{{ success }} <RouterLink :to="`/decks/${id}`">Voir le paquet →</RouterLink></p>
      <form class="stack" @submit.prevent="save"><fieldset :disabled="saving" class="editor-fieldset stack"><section class="surface panel stack"><div class="between"><h2>Le paquet</h2><span class="subtle">{{ dirty ? 'Modifications non enregistrées' : 'À jour' }}</span></div><UiField v-model="model.title" label="Titre du paquet" name="title" placeholder="Qu’avez-vous envie de retenir ?" required maxlength="160" :error="errors.title" /><UiField v-model="model.description" label="Description" name="description" multiline maxlength="4000" :error="errors.description" placeholder="Quelques mots pour donner envie d’explorer…" /><div class="form-grid"><UiField v-model="model.subject" name="subject" label="Matière" maxlength="100" placeholder="Ex. Biologie" :error="errors.subject" /><UiField v-model="model.level" name="level" label="Niveau" maxlength="100" placeholder="Ex. Licence 1" :error="errors.level" /><div class="field"><label for="editor-course">Cours (facultatif)</label><select id="editor-course" v-model="selectedCourse" @change="model.chapter = ''"><option value="">Paquet autonome</option><option v-for="course in courses" :key="course._id" :value="course._id">{{ course.title }}</option></select></div><div class="field"><label for="editor-chapter">Chapitre</label><select id="editor-chapter" v-model="model.chapter" :disabled="!selectedCourse"><option value="">Sans chapitre — paquet autonome</option><option v-for="chapter in chapterOptions" :key="chapter._id" :value="chapter._id">{{ chapter.title }}</option></select><small v-if="errors.chapter" class="field-error">{{ errors.chapter }}</small></div></div><UiField v-model="model.coverUrl" name="coverUrl" label="URL de couverture (facultatif)" type="url" maxlength="2048" :error="errors.coverUrl" hint="Adresse HTTP(S). Aucun téléversement de fichier dans cette version." /></section>
      <div class="between"><h2>Les cartes <span class="card-counter">{{ model.cards.length }}</span></h2><span class="subtle">Question → Réponse</span></div><section v-for="(card, index) in model.cards" :key="card.key" class="surface panel stack card-editor"><header class="between"><strong>Carte {{ index + 1 }}</strong><div class="actions"><button type="button" class="icon-button" :disabled="index === 0" :aria-label="`Monter la carte ${index + 1}`" @click="move(index,-1)"><ChevronUp :size="17" /></button><button type="button" class="icon-button" :disabled="index === model.cards.length-1" :aria-label="`Descendre la carte ${index + 1}`" @click="move(index,1)"><ChevronDown :size="17" /></button><button type="button" class="icon-button delete-link" :aria-label="`Supprimer la carte ${index + 1}`" @click="removeCard(index)"><Trash2 :size="16" /></button></div></header><div class="form-grid"><UiField v-model="card.front" :name="`front-${index}`" :label="`Question ${index + 1}`" multiline required :maxlength="publicConfig.cardTextMaxLength" placeholder="Une question claire et précise…" :error="errors[`card-${index}`]" /><UiField v-model="card.back" :name="`back-${index}`" :label="`Réponse ${index + 1}`" multiline required :maxlength="publicConfig.cardTextMaxLength" placeholder="L’essentiel à retenir…" :error="errors[`card-${index}`]" /></div><small>{{ card.front.length }} / {{ publicConfig.cardTextMaxLength }} · {{ card.back.length }} / {{ publicConfig.cardTextMaxLength }} caractères</small></section><button class="add-card" type="button" @click="addCard"><Plus :size="20" />Ajouter une carte</button>
      <section class="surface panel stack"><h2>À qui s’adresse ce paquet ?</h2><div class="field"><label for="visibility">Visibilité</label><select id="visibility" v-model="model.visibility" :aria-invalid="!!errors.visibility" aria-describedby="visibility-help"><option value="private">Privé — pour moi uniquement</option><option value="unlisted">Non listé — toute personne avec le lien</option><option value="public">Public — publier dans la communauté</option></select><small v-if="errors.visibility" class="field-error">{{ errors.visibility }}</small></div><p id="visibility-help" class="notice">{{ model.visibility === 'unlisted' ? 'L’identifiant est une capacité de lecture : toute personne disposant du lien peut lire et le transmettre. Ce n’est pas un lien signé. Repasser en privé coupe cet accès ; un retour en non listé réactive les anciens liens.' : model.visibility === 'public' ? 'Au moins une carte est nécessaire. Le paquet apparaîtra dans le fil et sur votre profil public. Passer ensuite en privé ou non listé supprimera ses likes et enregistrements.' : 'Seul votre compte peut consulter ce paquet. Vos cours et chapitres ne sont jamais rendus publics.' }}</p></section></fieldset>
      <div class="editor-save surface"><span class="subtle"><ShieldCheck :size="15" />Brouillon local sur cet appareil</span><div class="actions"><UiButton variant="secondary" :disabled="saving" @click="restore">Annuler</UiButton><UiButton type="submit" :busy="saving"><Save :size="16" />{{ model.visibility === 'public' ? 'Enregistrer et publier' : 'Enregistrer le paquet' }}</UiButton></div></div></form>
    </template>
  </div>
</template>
<style scoped>
.editor-fieldset{border:0;padding:0;margin:0;min-width:0}.card-counter{display:inline-grid;place-items:center;background:#ece7fb;color:#7660b6;border-radius:9px;min-width:30px;font-size:14px;margin-left:5px;padding:3px 8px}.card-editor header>strong{font-size:13px;color:#847394}.card-editor textarea{min-height:160px}.add-card{width:100%;border:1px dashed #cfc3ed;display:flex;gap:9px;justify-content:center;align-items:center;padding:22px;background:#f3f0fc;color:#7c67b7;border-radius:16px;font-size:13px;font-weight:650}.editor-save{position:sticky;bottom:18px;padding:17px 20px;display:flex;justify-content:space-between;gap:14px;align-items:center;box-shadow:0 5px 30px #3f296d10;z-index:5}.editor-save>.subtle{font-size:10px;display:flex;gap:6px;align-items:center}.draft-banner{display:grid;gap:12px;margin-bottom:20px}.narrow>.alert,.narrow>.notice{margin-bottom:20px}@media(max-width:767px){.editor-save{bottom:calc(85px + env(safe-area-inset-bottom));flex-direction:column;align-items:stretch}.editor-save>.subtle{display:none}.editor-save .actions{justify-content:flex-end}.card-editor header .actions{gap:5px}}
</style>