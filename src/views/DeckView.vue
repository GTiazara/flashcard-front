<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Pencil, Brain, Bookmark, Globe2, Share2, Trash2, RotateCw, ChevronLeft, ChevronRight, Layers3 } from 'lucide-vue-next'
import { api, errorMessage } from '../lib/api'
import { auth } from '../lib/auth'
import { allPages } from '../lib/pagination'
import { ownerId, type Deck } from '../types'
import Avatar from '../components/Avatar.vue'
import UiButton from '../components/UiButton.vue'
import LoadState from '../components/LoadState.vue'
import EmptyState from '../components/EmptyState.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
const route = useRoute(), router = useRouter(), deck = ref<Deck | null>(null), busy = ref(true), error = ref(''), actionError = ref(''), working = ref(false), saved = ref(false), savedKnown = ref(false)
const index = ref(0), flipped = ref(false), confirmDelete = ref(false), notice = ref('')
const own = computed(() => !!deck.value && ownerId(deck.value) === auth.user?._id)
const card = computed(() => deck.value?.cards?.[index.value])
const author = computed(() => deck.value && typeof deck.value.owner !== 'string' ? deck.value.owner : null)
async function load() {
  busy.value = true; error.value = ''
  try {
    deck.value = await api<Deck>(`/decks/${route.params.id}`)
    if (auth.user && deck.value.visibility === 'public') {
      try { saved.value = (await allPages<Deck>('/saved')).some(d => d._id === deck.value?._id); savedKnown.value = true }
      catch { savedKnown.value = false }
    }
  } catch (err) { error.value = errorMessage(err) } finally { busy.value = false }
}
async function toggleSave() {
  if (!auth.user) { await router.push({ path: '/login', query: { redirect: route.fullPath } }); return }
  if (!deck.value || working.value) return
  working.value = true; actionError.value = ''
  try { const result = await api<{ saved: boolean }>(`/decks/${deck.value._id}/save`, 'PUT', { saved: savedKnown.value ? !saved.value : true }); saved.value = result.saved; savedKnown.value = true }
  catch (err) { actionError.value = errorMessage(err) } finally { working.value = false }
}
async function publish() {
  if (!deck.value || working.value) return
  working.value = true; actionError.value = ''
  try { await api(`/decks/${deck.value._id}/publish`, 'POST'); deck.value.visibility = 'public'; notice.value = 'Votre paquet est maintenant publié dans le fil.' }
  catch (err) { actionError.value = errorMessage(err) } finally { working.value = false }
}
async function remove() {
  working.value = true; actionError.value = ''
  try { await api(`/decks/${deck.value?._id}`, 'DELETE'); confirmDelete.value = false; await router.push('/library') }
  catch (err) { actionError.value = errorMessage(err); confirmDelete.value = false } finally { working.value = false }
}
async function share() {
  try { await navigator.clipboard.writeText(`${location.origin}/decks/${deck.value?._id}`); notice.value = 'Lien copié. Toute personne avec ce lien peut lire un paquet public ou non listé.' }
  catch { notice.value = `Copiez l’adresse de cette page pour partager le paquet. ${location.origin}/decks/${deck.value?._id}` }
}
function move(delta: number) { index.value += delta; flipped.value = false }
onMounted(load)
</script>
<template><div class="narrow"><RouterLink to="/library" class="back-link"><ArrowLeft :size="16" />Bibliothèque</RouterLink><LoadState :busy="busy" :error="error" @retry="load" /><template v-if="deck && !error"><div class="page-heading"><div class="badges"><span v-if="deck.subject" class="badge">{{ deck.subject }}</span><span v-if="deck.level" class="badge neutral">{{ deck.level }}</span><span class="badge neutral">{{ { private: 'Privé', unlisted: 'Non listé', public: 'Public' }[deck.visibility] }}</span></div><h1 class="deck-title">{{ deck.title }}</h1><p class="text-pre">{{ deck.description }}</p></div><div class="deck-toolbar"><RouterLink v-if="author" :to="`/profile/${author.username}`" class="author"><Avatar :name="author.displayName" :url="author.avatarUrl" /><span>{{ author.displayName }}<small>@{{ author.username }}</small></span></RouterLink><span class="subtle count"><Layers3 :size="15" />{{ deck.cardCount }} cartes</span></div><div class="actions deck-actions"><RouterLink v-if="deck.cardCount" :to="`/study/${deck._id}`" class="btn btn-primary"><Brain :size="17" />Réviser ce paquet</RouterLink><UiButton v-else disabled><Brain :size="17" />Aucune carte à réviser</UiButton><RouterLink v-if="own" :to="`/decks/${deck._id}/edit`" class="btn btn-secondary"><Pencil :size="16" />Modifier</RouterLink><UiButton v-if="own && deck.visibility !== 'public'" variant="secondary" :disabled="!deck.cardCount" :busy="working" @click="publish"><Globe2 :size="16" />Publier</UiButton><UiButton v-if="deck.visibility === 'public'" variant="secondary" :busy="working" :aria-pressed="saved" @click="toggleSave"><Bookmark :size="16" />{{ saved ? 'Enregistré' : 'Enregistrer' }}</UiButton><UiButton v-if="deck.visibility !== 'private'" variant="ghost" @click="share"><Share2 :size="16" />Partager</UiButton></div><p v-if="deck.visibility === 'unlisted'" class="notice detail-notice">Ce paquet est non listé. Son identifiant donne accès à sa lecture, même sans compte. Le lien peut être transmis ; ce n’est pas un lien signé ou nominatif. Le propriétaire peut le rendre privé.</p><p v-if="notice" class="notice success detail-notice" role="status">{{ notice }}</p><p v-if="actionError" class="alert detail-notice" role="alert">{{ actionError }}</p><section v-if="card" class="surface panel preview-section"><div class="between section-title"><h2>Un aperçu pour commencer</h2><span class="subtle">{{ index + 1 }} / {{ deck.cards?.length }}</span></div><button class="flashcard" :aria-pressed="flipped" aria-label="Retourner la carte" @click="flipped = !flipped"><span class="face-label">{{ flipped ? 'Réponse' : 'Question' }}</span><span class="face-content">{{ flipped ? card.back : card.front }}</span><span class="flip-hint"><RotateCw :size="14" />Retourner la carte</span></button><div class="between preview-controls"><UiButton variant="secondary" :disabled="index === 0" @click="move(-1)"><ChevronLeft :size="17" />Précédente</UiButton><UiButton variant="secondary" :disabled="index >= (deck.cards?.length || 0)-1" @click="move(1)">Suivante<ChevronRight :size="17" /></UiButton></div></section><EmptyState v-else title="Les cartes arrivent bientôt." description="Ce paquet est encore vide. Son propriétaire peut y ajouter de nouvelles idées."><RouterLink v-if="own" :to="`/decks/${deck._id}/edit`" class="btn btn-primary">Ajouter des cartes</RouterLink></EmptyState><div v-if="own" class="delete-section"><UiButton variant="ghost" class="delete-link" @click="confirmDelete = true"><Trash2 :size="16" />Supprimer le paquet</UiButton><p class="subtle">La visibilité se modifie dans l’éditeur du paquet.</p></div></template><ConfirmDialog :open="confirmDelete" title="Supprimer définitivement ce paquet ?" message="Toutes ses cartes, sa publication, ses likes, ses enregistrements et son historique associé seront supprimés. Cette action est irréversible." :busy="working" @cancel="confirmDelete = false" @confirm="remove" /></div></template>
<style scoped>.deck-title{margin-top:18px;overflow-wrap:anywhere}.deck-toolbar{display:flex;justify-content:space-between;gap:15px;align-items:center;margin-bottom:25px}.author{display:flex;gap:10px;align-items:center;font-size:13px}.author small{display:block;font-size:10px}.count{display:flex;gap:6px;align-items:center}.deck-actions{margin-bottom:25px}.detail-notice{margin-bottom:20px;overflow-wrap:anywhere}.preview-controls{margin-top:20px}.delete-section{margin-top:30px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.preview-section h2{font-size:19px}</style>