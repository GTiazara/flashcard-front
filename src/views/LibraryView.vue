<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Plus, ArrowLeft, Pencil, Trash2, ChevronUp, ChevronDown, FolderOpen, Layers3, Bookmark } from 'lucide-vue-next'
import { api, errorMessage, fieldErrors } from '../lib/api'
import { allPages, usePagination } from '../lib/pagination'
import type { Chapter, Course, Deck } from '../types'
import UiButton from '../components/UiButton.vue'
import UiField from '../components/UiField.vue'
import EmptyState from '../components/EmptyState.vue'
import LoadState from '../components/LoadState.vue'
import DeckCard from '../components/DeckCard.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
const tab = ref('courses'), selected = ref<Course | null>(null), chapterId = ref('')
const courses = usePagination<Course>(() => '/courses'), saved = usePagination<Deck>(() => '/saved')
const decks = ref<Deck[]>([]), chapters = ref<Chapter[]>([]), deckLimit = ref(12), chapterLimit = ref(12), busy = ref(false), error = ref('')
const filtered = computed(() => {
  if (!selected.value) return decks.value
  const ids = new Set(chapters.value.map(chapter => chapter._id))
  return decks.value.filter(deck => chapterId.value ? deck.chapter === chapterId.value : !!deck.chapter && ids.has(deck.chapter))
})
const orderedDecks = computed(() => [...filtered.value].sort((a,b) => {
  if (!selected.value || chapterId.value) return 0
  return chapters.value.findIndex(c => c._id === a.chapter) - chapters.value.findIndex(c => c._id === b.chapter)
}))
const form = reactive({ kind: '' as '' | 'course' | 'chapter', id: '', title: '', description: '', color: '#6c5ce7', icon: 'book', position: 0 })
const formBusy = ref(false), formError = ref(''), errors = ref<Record<string,string>>({})
const deletion = ref<{ kind: 'course' | 'chapter'; id: string; title: string } | null>(null), deleting = ref(false)
async function loadOrganization() {
  busy.value = true; error.value = ''
  try { decks.value = await allPages<Deck>('/decks'); if (selected.value) chapters.value = await allPages<Chapter>(`/courses/${selected.value._id}/chapters`) }
  catch (err) { error.value = errorMessage(err) } finally { busy.value = false }
}
onMounted(() => { void courses.load(true); void loadOrganization() })
watch(tab, value => { deckLimit.value = 12; if (value === 'saved') void saved.load(true) })
watch(chapterId, () => { deckLimit.value = 12 })
async function openCourse(course: Course) { selected.value = course; chapterId.value = ''; chapters.value = []; chapterLimit.value = 12; deckLimit.value = 12; await loadOrganization() }
function edit(kind: 'course' | 'chapter', item?: Course | Chapter) {
  Object.assign(form, { kind, id: item?._id || '', title: item?.title || '', description: item?.description || '', color: item && 'color' in item ? item.color || '#6c5ce7' : '#6c5ce7', icon: item && 'icon' in item ? item.icon || 'book' : 'book', position: item && 'position' in item ? item.position : chapters.value.length })
  formError.value = ''; errors.value = {}
}
async function save() {
  formBusy.value = true; formError.value = ''; errors.value = {}
  const isCourse = form.kind === 'course'
  const path = isCourse ? `/courses${form.id ? `/${form.id}` : ''}` : form.id ? `/chapters/${form.id}` : `/courses/${selected.value?._id}/chapters`
  try {
    const payload = { title: form.title, description: form.description, ...(isCourse ? { color: form.color, icon: form.icon } : { position: Number(form.position) }) }
    const result = await api<Course | Chapter>(path, form.id ? 'PATCH' : 'POST', payload)
    if (isCourse && selected.value?._id === result._id) selected.value = result as Course
    form.kind = ''; await courses.load(true); await loadOrganization()
  } catch (err) { formError.value = errorMessage(err); errors.value = fieldErrors(err) }
  finally { formBusy.value = false }
}
async function remove() {
  if (!deletion.value) return
  deleting.value = true; error.value = ''
  try {
    await api(`/${deletion.value.kind === 'course' ? 'courses' : 'chapters'}/${deletion.value.id}`, 'DELETE')
    if (deletion.value.kind === 'course') { selected.value = null; chapters.value = [] }
    chapterId.value = ''; deletion.value = null; await courses.load(true); await loadOrganization()
  } catch (err) { error.value = errorMessage(err); deletion.value = null }
  finally { deleting.value = false }
}
async function move(index: number, delta: number) {
  const ordered = [...chapters.value], target = index + delta
  if (!ordered[target] || busy.value) return
  ;[ordered[index], ordered[target]] = [ordered[target]!, ordered[index]!]
  busy.value = true; error.value = ''
  try { for (let position = 0; position < ordered.length; position++) await api(`/chapters/${ordered[position]!._id}`, 'PATCH', { position }) }
  catch (err) { error.value = `${errorMessage(err)} Vérifiez l’ordre affiché avant de réessayer.` }
  finally { const moveError = error.value; await loadOrganization(); error.value ||= moveError }
}
</script>
<template>
  <div class="page-heading between"><div><p class="eyebrow">VOTRE JARDIN DE CONNAISSANCES</p><h1>La bibliothèque.</h1><p>Une place pour chaque idée, un chemin pour chaque envie.</p></div><RouterLink :to="{ path: '/create', query: chapterId ? { chapter: chapterId, course: selected?._id } : {} }" class="btn btn-primary"><Plus :size="17" />Nouveau paquet</RouterLink></div>
  <div class="tabs" role="group" aria-label="Sections de la bibliothèque"><button :class="{ active: tab === 'courses' }" :aria-pressed="tab === 'courses'" @click="tab = 'courses'"><FolderOpen :size="16" /> Cours</button><button :class="{ active: tab === 'decks' }" :aria-pressed="tab === 'decks'" @click="tab = 'decks'"><Layers3 :size="16" /> Paquets</button><button :class="{ active: tab === 'saved' }" :aria-pressed="tab === 'saved'" @click="tab = 'saved'"><Bookmark :size="16" /> Enregistrés</button></div>
  <section v-if="form.kind" class="surface panel stack organization-form">
    <h2>{{ form.id ? 'Modifier' : 'Nouveau' }} {{ form.kind === 'course' ? 'cours' : 'chapitre' }}</h2><p v-if="formError" class="alert" role="alert">{{ formError }}</p>
    <form class="stack" @submit.prevent="save"><UiField v-model="form.title" name="organization-title" label="Titre" required maxlength="160" :error="errors.title" /><UiField v-model="form.description" name="organization-description" label="Description" multiline maxlength="4000" :error="errors.description" /><div v-if="form.kind === 'course'" class="form-grid"><UiField v-model="form.color" name="color" label="Couleur" type="color" :error="errors.color" /><UiField v-model="form.icon" name="icon" label="Repère du cours" maxlength="40" :error="errors.icon" hint="Un court libellé, par exemple : livre, sciences…" /></div><UiField v-else v-model="form.position" name="position" label="Position" type="number" min="0" step="1" required :error="errors.position" /><div class="actions end"><UiButton variant="secondary" :disabled="formBusy" @click="form.kind = ''">Annuler</UiButton><UiButton type="submit" :busy="formBusy">Enregistrer</UiButton></div></form>
  </section>
  <template v-if="tab === 'courses'">
    <template v-if="!selected"><div class="between section-title"><h2>Mes cours</h2><UiButton variant="secondary" @click="edit('course')"><Plus :size="16" />Nouveau cours</UiButton></div><div class="grid"><article v-for="course in courses.items.value" :key="course._id" class="course-card surface"><span class="course-marker" :style="{ backgroundColor: /^#[0-9a-f]{6}$/i.test(course.color || '') ? course.color : '#6c5ce7' }"><FolderOpen :size="25" /></span><h3><button @click="openCourse(course)">{{ course.title }}</button></h3><p class="clamp muted">{{ course.description || 'Organisez vos chapitres et vos paquets.' }}</p><small v-if="course.icon" class="course-icon-label">{{ course.icon }}</small><small v-if="course.createdAt">Créé le {{ new Date(course.createdAt).toLocaleDateString('fr-FR') }}</small><div class="actions"><UiButton variant="ghost" @click="openCourse(course)">Ouvrir <ArrowLeft :size="14" class="rotate" /></UiButton><button class="icon-button" :aria-label="`Modifier ${course.title}`" @click="edit('course', course)"><Pencil :size="15" /></button><button class="icon-button delete-link" :aria-label="`Supprimer ${course.title}`" @click="deletion = { kind: 'course', id: course._id, title: course.title }"><Trash2 :size="15" /></button></div></article></div><EmptyState v-if="!courses.busy.value && !courses.error.value && !courses.items.value.length" title="Chaque apprentissage commence quelque part." description="Créez un cours pour rassembler vos chapitres. Vous pouvez aussi créer des paquets sans cours."><UiButton @click="edit('course')"><Plus :size="16" />Créer un cours</UiButton></EmptyState><LoadState :busy="courses.busy.value" :error="courses.error.value" :more="courses.hasMore.value" @retry="courses.load(true)" @more="courses.load()" /></template>
    <template v-else><button class="back-link" @click="selected = null; chapterId = ''"><ArrowLeft :size="16" />Tous mes cours</button><section class="surface panel stack"><div class="between"><div><p class="eyebrow">MON COURS</p><h2>{{ selected.title }}</h2></div><div class="actions"><UiButton variant="secondary" @click="edit('course', selected)"><Pencil :size="15" />Modifier</UiButton><UiButton variant="ghost" @click="deletion = { kind: 'course', id: selected._id, title: selected.title }"><Trash2 :size="16" />Supprimer</UiButton></div></div><p class="muted text-pre">{{ selected.description }}</p><div class="between"><h3>Chapitres</h3><UiButton variant="secondary" @click="edit('chapter')"><Plus :size="15" />Ajouter un chapitre</UiButton></div><div v-for="(chapter, index) in chapters.slice(0, chapterLimit)" :key="chapter._id" class="chapter-row"><button class="chapter-title" :class="{ active: chapterId === chapter._id }" @click="chapterId = chapterId === chapter._id ? '' : chapter._id"><span>{{ index + 1 }}</span><strong>{{ chapter.title }}</strong><small v-if="chapter.description">{{ chapter.description }}</small></button><div class="actions"><button class="icon-button" :disabled="index === 0 || busy" :aria-label="`Monter ${chapter.title}`" @click="move(index, -1)"><ChevronUp :size="15" /></button><button class="icon-button" :disabled="index === chapters.length - 1 || busy" :aria-label="`Descendre ${chapter.title}`" @click="move(index, 1)"><ChevronDown :size="15" /></button><button class="icon-button" :aria-label="`Modifier ${chapter.title}`" @click="edit('chapter', chapter)"><Pencil :size="15" /></button><button class="icon-button delete-link" :aria-label="`Supprimer ${chapter.title}`" @click="deletion = { kind: 'chapter', id: chapter._id, title: chapter.title }"><Trash2 :size="15" /></button></div></div><p v-if="!busy && !chapters.length" class="muted">Aucun chapitre pour le moment. Ajoutez le premier.</p><UiButton v-if="chapters.length > chapterLimit" variant="secondary" @click="chapterLimit += 12">Charger plus</UiButton></section><div class="between section-title course-decks-title"><h2>{{ chapterId ? 'Paquets du chapitre' : 'Paquets du cours' }}</h2><UiButton v-if="chapterId" variant="ghost" @click="chapterId = ''">Tous les chapitres</UiButton></div></template>
  </template>
  <template v-if="tab === 'decks' || (tab === 'courses' && selected)"><div v-if="tab === 'decks'" class="between section-title"><h2>Mes paquets</h2><UiButton v-if="selected" variant="ghost" @click="selected = null; chapterId = ''">Retirer le filtre du cours</UiButton></div><div class="grid"><DeckCard v-for="deck in orderedDecks.slice(0, deckLimit)" :key="deck._id" :deck="deck" /></div><EmptyState v-if="!busy && !error && !filtered.length" title="La prochaine idée vous appartient." description="Aucun paquet dans cette sélection. Créez quelques cartes pour commencer."><RouterLink :to="{ path: '/create', query: chapterId ? { chapter: chapterId, course: selected?._id } : {} }" class="btn btn-primary">Créer un paquet</RouterLink></EmptyState><LoadState :busy="busy" :error="error" :more="orderedDecks.length > deckLimit" @retry="loadOrganization" @more="deckLimit += 12" /></template>
  <template v-if="tab === 'saved'"><p class="notice saved-notice">Ces paquets restent liés à leurs créateurs. Ils ne sont ni copiés ni modifiables et disparaissent d’ici s’ils ne sont plus publics.</p><div class="grid"><DeckCard v-for="deck in saved.items.value" :key="deck._id" :deck="deck"><UiButton variant="ghost" @click="async () => { try { await api(`/decks/${deck._id}/save`, 'PUT', { saved: false }); await saved.load(true) } catch (err) { error = errorMessage(err) } }">Retirer des enregistrements</UiButton></DeckCard></div><p v-if="error" class="alert" role="alert">{{ error }}</p><EmptyState v-if="!saved.busy.value && !saved.error.value && !saved.items.value.length" title="Gardez vos découvertes à portée de main." description="Les paquets que vous enregistrez dans le fil apparaissent ici."><RouterLink to="/feed" class="btn btn-primary">Explorer les paquets</RouterLink></EmptyState><LoadState :busy="saved.busy.value" :error="saved.error.value" :more="saved.hasMore.value" @retry="saved.load(true)" @more="saved.load()" /></template>
  <p v-if="tab === 'courses' && !selected && error" class="alert" role="alert">{{ error }}</p>
  <ConfirmDialog :open="!!deletion" :busy="deleting" :title="`Supprimer « ${deletion?.title || ''} » ?`" message="Cette suppression est définitive : les chapitres concernés, leurs paquets, cartes, publications, enregistrements et historiques associés seront supprimés. Les paquets déjà détachés sont conservés." @cancel="deletion = null" @confirm="remove" />
</template>
<style scoped>
.tabs button{display:flex;align-items:center;gap:7px}.organization-form{margin-bottom:28px;max-width:780px}.course-card{padding:25px;display:grid;gap:15px}.course-marker{display:grid;place-items:center;width:52px;height:52px;border-radius:15px;color:white}.course-card h3 button{text-align:left;border:0;padding:0;background:none}.course-card p{font-size:12px}.course-card .actions{margin-top:8px}.course-card .actions .btn{margin-right:auto}.rotate{transform:rotate(180deg)}.course-icon-label{font-style:italic}.chapter-row{display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--border);padding-top:15px;align-items:center}.chapter-title{display:grid;grid-template-columns:28px 1fr;gap:4px 12px;text-align:left;background:transparent;border:0;padding:8px 0;min-width:0}.chapter-title>span{grid-row:span 2;color:#8873bb}.chapter-title strong{font-size:13px;overflow-wrap:anywhere}.chapter-title small{font-size:11px}.chapter-title.active{color:#6c5ce7}.chapter-row .actions{gap:5px}.chapter-row .icon-button{width:36px;height:38px}.course-decks-title{margin-top:30px}.saved-notice{margin-bottom:22px}@media(max-width:600px){.chapter-row{align-items:flex-start;flex-direction:column}.chapter-row .actions{align-self:flex-end}.chapter-row .icon-button{width:42px;height:42px}}
</style>