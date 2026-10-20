<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, SlidersHorizontal, Heart, Bookmark, Layers3, ArrowUpRight, Lightbulb, Plus, ArrowRight } from 'lucide-vue-next'
import { auth } from '../lib/auth'
import { api, errorMessage } from '../lib/api'
import { usePagination } from '../lib/pagination'
import type { Publication } from '../types'
import Avatar from '../components/Avatar.vue'
import UiButton from '../components/UiButton.vue'
import EmptyState from '../components/EmptyState.vue'
import LoadState from '../components/LoadState.vue'
import CardFace from '../components/CardFace.vue'
import FlipCard from '../components/FlipCard.vue'
const router = useRouter(), query = ref(''), search = ref(''), sort = ref('recent')
const { items, busy, error, hasMore, load } = usePagination<Publication>(() => `/feed?sort=${sort.value}&q=${encodeURIComponent(search.value)}`)
const flipped = reactive(new Set<string>()), pending = reactive(new Set<string>()), actionError = ref('')
let timer: ReturnType<typeof setTimeout>
watch(query, () => { clearTimeout(timer); timer = setTimeout(() => { search.value = query.value.trim() }, 350) })
watch([sort, search], () => { void load(true) })
onMounted(() => { void load(true) }); onUnmounted(() => clearTimeout(timer))
function flip(id: string) { flipped.has(id) ? flipped.delete(id) : flipped.add(id) }
async function action(publication: Publication, kind: 'like' | 'save') {
  if (!auth.user) { await router.push({ path: '/login', query: { redirect: '/feed' } }); return }
  const key = `${publication._id}:${kind}`
  if (pending.has(key)) return
  pending.add(key); actionError.value = ''
  try {
    if (kind === 'like') Object.assign(publication, await api<{ liked: boolean; likeCount: number }>(`/publications/${publication._id}/like`, 'PUT', { liked: !publication.liked }))
    else { const result = await api<{ saved: boolean }>(`/decks/${publication.deck._id}/save`, 'PUT', { saved: !publication.saved }); publication.saved = result.saved }
  } catch (err) { actionError.value = `${errorMessage(err)} Le contenu a peut-être été retiré ; actualisez le fil.` }
  finally { pending.delete(key) }
}
</script>
<template>
  <div class="feed-layout">
    <section class="feed-main">
      <div class="search-bar"><Search :size="19" /><input v-model="query" type="search" aria-label="Rechercher des paquets" placeholder="Un sujet, un paquet, un esprit curieux…" /><SlidersHorizontal :size="17" aria-hidden="true" /></div>
      <div class="feed-sort"><div class="tabs"><button :class="{ active: sort === 'recent' }" :aria-pressed="sort === 'recent'" @click="sort = 'recent'">Dernières découvertes</button><button :class="{ active: sort === 'popular' }" :aria-pressed="sort === 'popular'" @click="sort = 'popular'">Les plus aimés</button></div><span class="subtle">À explorer à votre rythme</span></div>
      <p v-if="actionError" role="alert" class="alert">{{ actionError }} <UiButton variant="ghost" @click="load(true)">Actualiser</UiButton></p>
      <div class="stack">
        <article v-for="publication in items" :key="publication._id" class="publication surface">
          <header><RouterLink :to="`/profile/${publication.owner.username}`" class="author"><Avatar :name="publication.owner.displayName" :url="publication.owner.avatarUrl" /><span><strong>{{ publication.owner.displayName }}</strong><small>@{{ publication.owner.username }} <span>·</span> {{ new Date(publication.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) }}</small></span></RouterLink><span class="publication-label">A PARTAGÉ UN PAQUET</span></header>
          <div class="badges"><span v-if="publication.deck.subject" class="badge">{{ publication.deck.subject }}</span><span v-if="publication.deck.level" class="badge neutral">{{ publication.deck.level }}</span></div>
          <h2><RouterLink :to="`/decks/${publication.deck._id}`">{{ publication.deck.title }}</RouterLink></h2><p v-if="publication.deck.description" class="publication-description text-pre">{{ publication.deck.description }}</p>
          <FlipCard v-if="publication.deck.preview" class="preview" tone="feed" :flipped="flipped.has(publication._id)" :label="flipped.has(publication._id) ? 'Afficher la question' : 'Afficher la réponse'" hint="Cliquez pour retourner la carte" @flip="flip(publication._id)"><template #front><CardFace label="UNE CARTE POUR COMMENCER" :text="publication.deck.preview.front" :image-url="publication.deck.preview.frontImageUrl" /></template><template #back><CardFace label="LA RÉPONSE" :text="publication.deck.preview.back" :image-url="publication.deck.preview.backImageUrl" /></template></FlipCard>
          <div class="publication-meta"><span><Layers3 :size="14" />{{ publication.deck.cardCount }} cartes à découvrir</span><RouterLink :to="`/decks/${publication.deck._id}`">Voir le paquet <ArrowUpRight :size="15" /></RouterLink></div>
          <footer><div class="actions"><button class="social-button" :class="{ selected: publication.liked }" :aria-pressed="publication.liked" :disabled="pending.has(`${publication._id}:like`)" :aria-label="publication.liked ? 'Ne plus aimer' : 'Aimer ce paquet'" @click="action(publication, 'like')"><Heart :size="18" :fill="publication.liked ? 'currentColor' : 'none'" /><span>{{ publication.likeCount }}</span></button><button class="social-button" :class="{ selected: publication.saved }" :aria-pressed="publication.saved" :disabled="pending.has(`${publication._id}:save`)" @click="action(publication, 'save')"><Bookmark :size="18" :fill="publication.saved ? 'currentColor' : 'none'" /><span>{{ publication.saved ? 'Enregistré' : 'Enregistrer' }}</span></button></div><RouterLink :to="`/study/${publication.deck._id}`" class="btn btn-primary">Réviser <ArrowRight :size="15" /></RouterLink></footer>
        </article>
      </div>
      <EmptyState v-if="!busy && !error && !items.length" :title="search ? 'La découverte se fait attendre.' : 'La première idée pourrait être la vôtre.'" :description="search ? 'Aucun paquet public ne correspond à cette recherche. Essayez un autre mot.' : 'Les paquets publics de la communauté apparaîtront ici. En attendant, créez votre premier paquet.'"><RouterLink to="/create" class="btn btn-primary"><Plus :size="16" />Créer un paquet</RouterLink></EmptyState>
      <LoadState :busy="busy" :error="error" :more="hasMore" @retry="load(true)" @more="load()" />
    </section>
    <aside class="feed-aside"><section class="tip-card"><div class="tip-top"><span><Lightbulb :size="20" /></span><span>LE PETIT CONSEIL</span></div><h2>La mémoire aime<br />les petits rendez-vous.</h2><p>Quelques cartes aujourd’hui, un peu plus demain. L’important n’est pas d’aller vite, mais de revenir.</p><RouterLink to="/study">Un moment pour réviser <ArrowUpRight :size="16" /></RouterLink><div class="tip-decoration" aria-hidden="true">✦</div></section><section class="create-tip surface"><span class="create-tip-icon"><Layers3 :size="22" /></span><h3>Une idée en tête ?<br />Faites-en un paquet.</h3><p>Transformez ce que vous apprenez en cartes qui restent.</p><RouterLink to="/create" class="btn btn-secondary"><Plus :size="16" /> Créer mon paquet</RouterLink></section><p class="aside-footer">Un espace pour apprendre ensemble.<br />Sans compétition, juste de la curiosité.</p></aside>
  </div>
</template>
<style scoped>
.feed-layout{display:grid;grid-template-columns:minmax(0,680px) 260px;justify-content:center;gap:32px}.feed-main{min-width:0}.eyebrow{display:flex;align-items:center;gap:7px}.search-bar{display:flex;align-items:center;gap:10px;background:white;border:1px solid var(--border);border-radius:12px;padding:3px 15px;color:#9b92aa;margin-bottom:20px}.search-bar input{border:0;background:transparent;font-size:12px;padding:14px 0}.search-bar input:focus-visible{outline-offset:1px}.feed-sort{display:flex;justify-content:space-between;align-items:center;margin-bottom:21px;gap:10px}.feed-sort>.subtle{font-size:9px;white-space:nowrap}.feed-sort .tabs{margin:0;border:0;gap:5px}.feed-sort .tabs button{padding:8px 13px;border:0;font-size:11px;border-radius:8px}.feed-sort .tabs button.active{background:#eeeafb}.publication{padding:25px}.publication header{display:flex;justify-content:space-between;align-items:center;margin-bottom:23px;gap:10px}.author{display:flex;gap:10px;align-items:center;min-width:0}.author strong{display:block;font-size:12px}.author small{display:block;font-size:10px}.author small span{margin:0 5px}.publication-label{font-size:8px;letter-spacing:1px;color:#a59aaf;text-align:right}.publication h2{margin:13px 0 8px;font-size:23px;overflow-wrap:anywhere}.publication-description{color:#7c7489;font-size:12px;line-height:1.8;margin-bottom:22px}.preview{min-height:220px;margin-top:20px}.preview .face-content{font-family:Georgia,serif;font-size:23px}.publication-meta{display:flex;justify-content:space-between;gap:8px;padding:16px 0 19px;font-size:10px;color:#9a90aa}.publication-meta span,.publication-meta a{display:flex;gap:6px;align-items:center}.publication-meta a{color:#8c7dae}.publication footer{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);padding-top:17px;gap:10px}.publication footer .btn{font-size:11px;min-height:38px;padding:8px 14px}.social-button{display:flex;align-items:center;gap:7px;color:#8c829b;border:0;background:transparent;padding:8px 5px;font-size:10px;min-height:40px}.social-button.selected{color:#6c5ce7}.feed-aside{padding-top:12px}.tip-card{position:relative;overflow:hidden;padding:25px 23px;background:#f0eafa;border:1px solid #e6ddf4;border-radius:20px}.tip-top{display:flex;align-items:center;gap:10px;font-size:9px;letter-spacing:1.2px;color:#8f79ac}.tip-top>span:first-child{display:grid;place-items:center;width:36px;height:36px;background:#e7dbf6;border-radius:11px}.tip-card h2{font-family:Georgia,serif;font-weight:400;font-size:25px;line-height:1.4;margin:22px 0 15px;letter-spacing:-.5px;color:#67527c}.tip-card p{font-size:12px;line-height:1.9;color:#897691}.tip-card a{display:flex;gap:7px;align-items:center;font-size:10px;font-weight:650;color:#79618d;margin:24px 0 14px}.tip-decoration{font-size:90px;color:#dfd1ed;line-height:1;text-align:right;margin:0 -5px -15px 0}.create-tip{padding:25px 22px;margin-top:22px}.create-tip-icon{display:inline-grid;place-items:center;background:#f8f3e9;color:#b79a68;border-radius:12px;padding:12px;margin-bottom:16px}.create-tip h3{font-size:17px;line-height:1.5}.create-tip p{font-size:11px;color:#948999;line-height:1.9;margin:12px 0 20px}.create-tip .btn{width:100%;font-size:11px}.aside-footer{text-align:center;font-size:9px;line-height:1.9;color:#aaa0b4;margin-top:25px}@media(max-width:1220px){.feed-layout{grid-template-columns:minmax(0,680px)}.feed-aside{display:none}}@media(max-width:767px){.feed-layout{gap:0}.publication{padding:20px}.feed-sort>.subtle{display:none}.publication-label{display:none}.publication h2{font-size:21px}.preview .face-content{font-size:21px}.publication footer .actions{gap:4px}.publication-meta{font-size:9px}}
.publication-description { color: #74687f; }
.publication-label, .publication-meta, .publication-meta a, .social-button { color: #756780; }
.tip-top, .tip-card p, .create-tip p, .aside-footer { color: #776383; }
</style>