<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Bookmark, Brain } from 'lucide-vue-next'
import { auth } from '../lib/auth'
import { api, errorMessage } from '../lib/api'
import Avatar from '../components/Avatar.vue'
import CardFace from '../components/CardFace.vue'
import FlipCard from '../components/FlipCard.vue'
import EmptyState from '../components/EmptyState.vue'
import MarkdownContent from '../components/MarkdownContent.vue'
import { getStaticAuthor, getStaticPublication, staticPublications } from '../lib/static-content'

const route = useRoute(), router = useRouter()
const author = computed(() => getStaticAuthor(String(route.params.username || '')))
const deck = computed(() => getStaticPublication(String(route.params.slug || '')))
const packages = computed(() => staticPublications.filter(item => item.owner.username === author.value?.username))
const flipped = ref(false)
const saved = ref(false), saving = ref(false), saveError = ref('')
async function loadSaved() {
  if (!deck.value || !auth.user) return
  try { saved.value = (await api<{ slugs: string[] }>('/saved-static')).slugs.includes(deck.value.slug) } catch { /* Le bouton reste disponible pour une nouvelle tentative. */ }
}
async function toggleSaved() {
  if (!auth.user) { await router.push({ path: '/login', query: { redirect: route.fullPath } }); return }
  if (!deck.value || saving.value) return
  saving.value = true; saveError.value = ''
  try { const result = await api<{ saved: boolean }>(`/saved-static/${deck.value.slug}`, 'PUT', { saved: !saved.value }); saved.value = result.saved }
  catch (error) { saveError.value = errorMessage(error) }
  finally { saving.value = false }
}
onMounted(() => { void loadSaved() })
</script>

<template>
  <div v-if="author && !deck" class="narrow">
    <section class="profile-header surface"><div class="profile-cover" aria-hidden="true"><span>✦</span></div><div class="profile-content"><Avatar :name="author.displayName" /><h1>{{ author.displayName }}</h1><p class="username">@{{ author.username }} · profil statique</p><p class="profile-bio">{{ author.bio }}</p><div class="profile-count"><strong>{{ packages.length }}</strong> paquet{{ packages.length > 1 ? 's' : '' }} public{{ packages.length > 1 ? 's' : '' }}</div></div></section>
    <div class="between section-title public-decks-heading"><h2>Les cours et paquets</h2><span class="subtle">Contenus Markdown</span></div>
    <div class="grid"><article v-for="item in packages" :key="item._id" class="surface panel"><div class="badges"><span class="badge">{{ item.course }}</span><span v-if="item.level" class="badge neutral">{{ item.level }}</span></div><h2 class="static-title"><RouterLink :to="`/static/${item.slug}`">{{ item.title }}</RouterLink></h2><p class="subtle">{{ item.description }}</p><div class="between"><span class="subtle">{{ item.cardCount }} cartes</span><RouterLink class="btn btn-primary" :to="`/static/${item.slug}`">Ouvrir le paquet</RouterLink></div></article></div>
    <EmptyState v-if="!packages.length" title="Aucun contenu publié" description="Ajoutez un fichier Markdown dans src/content/static."><RouterLink to="/feed" class="btn btn-secondary">Explorer</RouterLink></EmptyState>
  </div>
  <div v-else-if="deck" class="narrow">
    <RouterLink :to="`/static-author/${deck.owner.username}`" class="back-link"><ArrowLeft :size="16" />{{ deck.owner.displayName }}</RouterLink>
    <div class="page-heading"><div class="badges"><span class="badge">{{ deck.course }}</span><span v-if="deck.level" class="badge neutral">{{ deck.level }}</span><span class="badge neutral">Publication statique</span></div><h1>{{ deck.title }}</h1><p>{{ deck.description }}</p></div>
    <div class="deck-toolbar"><RouterLink :to="`/static-author/${deck.owner.username}`" class="author"><Avatar :name="deck.owner.displayName" /><span>{{ deck.owner.displayName }}<small>@{{ deck.owner.username }} · source Markdown</small></span></RouterLink><span class="subtle">{{ deck.cardCount }} cartes</span></div>
    <div class="actions static-actions"><RouterLink class="btn btn-primary" :to="`/static/${deck.slug}/study`"><Brain :size="16" />Réviser ce paquet</RouterLink><button class="btn btn-secondary" :aria-pressed="saved" :disabled="saving" @click="toggleSaved"><Bookmark :size="16" :fill="saved ? 'currentColor' : 'none'" />{{ saved ? 'Enregistré' : 'Enregistrer' }}</button></div><p v-if="saveError" class="alert" role="alert">{{ saveError }}</p>
    <section v-if="deck.body" class="surface panel static-body"><MarkdownContent :source="deck.body" /></section>
    <section v-if="deck.sections.definition" class="surface panel static-body"><h2>Définition</h2><MarkdownContent :source="deck.sections.definition" /></section>
    <section v-if="deck.sections.example" class="surface panel static-body"><h2>Exemple</h2><MarkdownContent :source="deck.sections.example" /></section>
    <section v-if="deck.sections.takeaway" class="surface panel static-body"><h2>À retenir</h2><MarkdownContent :source="deck.sections.takeaway" /></section>
    <section v-if="deck.sections.credits" class="surface panel static-body"><h2>Crédits des images</h2><MarkdownContent :source="deck.sections.credits" /></section>
    <section class="surface panel static-cards"><div class="between section-title"><h2>Un aperçu pour commencer</h2><span class="subtle">{{ deck.cardCount }} cartes</span></div><FlipCard :flipped="flipped" label="Retourner la carte" hint="Retourner la carte" @flip="flipped = !flipped"><template #front><CardFace label="Question" :text="deck.cards?.[0]?.front" /></template><template #back><CardFace label="Réponse" :text="deck.cards?.[0]?.back" /></template></FlipCard><RouterLink class="btn btn-primary" :to="`/static/${deck.slug}/study`"><Brain :size="16" />Réviser ce paquet</RouterLink></section>
  </div>
  <EmptyState v-else title="Publication statique introuvable" description="Ce cours ou ce profil n’existe pas, ou son fichier Markdown est en brouillon."><RouterLink to="/feed" class="btn btn-primary">Explorer les publications</RouterLink></EmptyState>
</template>

<style scoped>
.profile-header{overflow:hidden}.profile-cover{height:130px;background:linear-gradient(115deg,#e8e0f6,#f4eaf1 65%,#f4efe5);position:relative}.profile-cover span{position:absolute;right:45px;top:-40px;color:#d2c0e5;font-size:150px}.profile-content{padding:0 30px 28px}.profile-content>.avatar{width:76px;height:76px;margin-top:-34px;position:relative;border:5px solid white;font-size:23px}.profile-content h1{margin-top:14px}.username,.profile-bio{margin-top:8px;color:var(--muted)}.profile-count{margin-top:18px;color:var(--muted)}.public-decks-heading{margin-top:35px}.static-title{margin:16px 0 8px}.static-title a{color:#5145cd}.panel>.between:last-child{margin-top:20px}.deck-toolbar{display:flex;justify-content:space-between;align-items:center;margin:-12px 0 22px}.author{display:flex;align-items:center;gap:10px}.author small{display:block}.static-actions{margin-bottom:20px}.static-body,.static-cards{margin:22px 0}.static-body h2{font-size:19px;margin-bottom:12px}.static-cards>.btn{margin-top:20px}
</style>
