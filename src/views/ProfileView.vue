<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Pencil, ShieldCheck, Globe2, LogOut } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { api, errorMessage, fieldErrors } from '../lib/api'
import { auth, logout } from '../lib/auth'
import type { Profile } from '../types'
import Avatar from '../components/Avatar.vue'
import UiButton from '../components/UiButton.vue'
import UiField from '../components/UiField.vue'
import DeckCard from '../components/DeckCard.vue'
import LoadState from '../components/LoadState.vue'
import EmptyState from '../components/EmptyState.vue'
const route = useRoute(), router = useRouter(), profile = ref<Profile | null>(null), busy = ref(false), error = ref(''), page = ref(0), editing = ref(false), saving = ref(false), saveError = ref(''), errors = ref<Record<string,string>>({}), notice = ref('')
const own = computed(() => auth.user?.username === route.params.username)
const form = reactive({ displayName: '', bio: '', avatarUrl: '' })
async function load(reset = false) {
  if (busy.value) return
  busy.value = true; error.value = ''
  try {
    const result = await api<Profile>(`/profiles/${encodeURIComponent(String(route.params.username))}?page=${reset ? 1 : page.value+1}&limit=12`)
    profile.value = !reset && profile.value ? { ...result, decks: [...profile.value.decks, ...result.decks] } : result
    page.value = result.page
  } catch (err) { error.value = errorMessage(err) } finally { busy.value = false }
}
function edit() { if (!profile.value) return; Object.assign(form, { displayName: profile.value.displayName, bio: profile.value.bio || '', avatarUrl: profile.value.avatarUrl || '' }); editing.value = true; saveError.value = ''; notice.value = '' }
async function save() {
  saving.value = true; saveError.value = ''; errors.value = {}
  try {
    const result = await api<Profile>(`/profiles/${encodeURIComponent(String(route.params.username))}`, 'PATCH', form)
    if (auth.user) Object.assign(auth.user, { displayName: result.displayName, bio: result.bio, avatarUrl: result.avatarUrl })
    editing.value = false; notice.value = 'Votre profil public a été mis à jour.'; await load(true)
  } catch (err) { saveError.value = errorMessage(err); errors.value = fieldErrors(err) } finally { saving.value = false }
}
async function signOut() { try { if (await logout()) await router.push('/login') } catch (err) { error.value = errorMessage(err) } }
onMounted(() => { void load(true) })
</script>
<template><div class="narrow">
  <UiButton v-if="own" variant="ghost" @click="signOut"><LogOut :size="16" />Quitter ce profil</UiButton>
  <section v-if="own && auth.user?.isGuest" class="notice stack">
      <h2>Profil temporaire</h2>
      <p>Votre accès dépend du cookie de ce navigateur. Supprimer les cookies, changer de navigateur ou quitter ce profil peut vous faire perdre l’accès à vos cartes. Il n’est pas réinitialisé chaque jour.</p>
      <p>Sans email associé avant conversion, ce profil ne peut pas être récupéré par email. Conservez-le en lui associant un compte.</p>
      <RouterLink to="/register" class="btn btn-secondary">Conserver mon profil</RouterLink>
    </section>
    <LoadState :busy="busy && !profile" :error="error" @retry="load(true)" /><template v-if="profile"><section class="profile-header surface"><div class="profile-cover" aria-hidden="true"><span>✦</span></div><div class="profile-content"><div class="between"><Avatar :name="profile.displayName" :url="profile.avatarUrl" /><UiButton v-if="own && !editing" variant="secondary" @click="edit"><Pencil :size="15" />Modifier mon profil</UiButton></div><h1>{{ profile.displayName }}</h1><p class="username">@{{ profile.username }}</p><p v-if="profile.bio" class="profile-bio text-pre">{{ profile.bio }}</p><div class="profile-count"><Globe2 :size="16" /><strong>{{ profile.publicDeckCount }}</strong> paquet{{ profile.publicDeckCount > 1 ? 's' : '' }} public{{ profile.publicDeckCount > 1 ? 's' : '' }}</div><p class="follow-note">Les abonnements ne sont pas inclus dans cette version de Mnemo.</p></div></section><p v-if="notice" class="notice success profile-notice" role="status">{{ notice }}</p><section v-if="editing && own" class="surface panel stack profile-editor"><h2>Un peu plus sur vous.</h2><p class="notice">Ces informations sont publiques. N’y indiquez aucune donnée sensible. Votre nom d’utilisateur ne peut pas être modifié.</p><p v-if="saveError" class="alert" role="alert">{{ saveError }}</p><form class="stack" @submit.prevent="save"><UiField v-model="form.displayName" label="Nom affiché" name="displayName" required maxlength="80" :error="errors.displayName" /><UiField v-model="form.bio" label="Biographie publique" name="bio" multiline maxlength="1000" :error="errors.bio" /><UiField v-model="form.avatarUrl" label="URL de l’avatar" name="avatarUrl" type="url" maxlength="2048" hint="Adresse HTTP(S) facultative. Une image externe peut transmettre votre adresse IP à son hébergeur." :error="errors.avatarUrl" /><div class="actions end"><UiButton variant="secondary" :disabled="saving" @click="editing = false">Annuler</UiButton><UiButton type="submit" :busy="saving">Enregistrer le profil</UiButton></div></form></section><div class="between section-title public-decks-heading"><h2>Les idées partagées.</h2><span class="subtle">Paquets publics uniquement</span></div><div class="grid"><DeckCard v-for="deck in profile.decks" :key="deck._id" :deck="deck" /></div><EmptyState v-if="!profile.decks.length" :title="own ? 'Vos idées ont leur place ici.' : 'Les idées prennent leur temps.'" :description="own ? 'Publiez un paquet pour le partager sur votre profil et dans la communauté. Vos paquets privés restent dans votre bibliothèque.' : 'Ce profil ne partage aucun paquet public pour le moment.'"><RouterLink v-if="own" to="/library" class="btn btn-primary">Ma bibliothèque</RouterLink></EmptyState><LoadState :busy="busy && !!profile" :more="profile.hasMore" @more="load()" /><section v-if="own" class="surface panel privacy-panel"><h3><ShieldCheck :size="19" />Votre confidentialité, simplement.</h3><p>Votre email n’est jamais affiché ici. Vos cours, chapitres, paquets privés et historique de révision restent personnels. La visibilité se choisit dans chaque paquet.</p><p>Le backend ne propose pas de profil privé ni de paramètres globaux de confidentialité. Aucun réglage non fonctionnel n’est affiché.</p></section></template></div></template>
<style scoped>.profile-header{overflow:hidden}.profile-cover{height:130px;background:linear-gradient(115deg,#e8e0f6,#f4eaf1 65%,#f4efe5);position:relative;overflow:hidden}.profile-cover span{position:absolute;right:45px;top:-40px;color:#d2c0e5;font-size:150px;font-family:Georgia,serif;transform:rotate(15deg)}.profile-content{padding:0 30px 28px}.profile-content>.between{margin-top:-30px;position:relative;align-items:flex-end}.profile-content .avatar{width:85px;height:85px;font-size:26px;border:5px solid white}.profile-content .btn{margin-bottom:8px}.profile-content h1{font-size:31px;margin-top:20px;overflow-wrap:anywhere}.username{color:#9a8ba7;font-size:13px;margin-top:7px}.profile-bio{font-size:14px;line-height:1.85;color:#756b81;margin-top:20px}.profile-count{display:flex;align-items:center;gap:7px;font-size:12px;color:#8d7b9e;margin-top:23px}.profile-count strong{color:#665172}.follow-note{font-size:10px;color:#9b90a4;margin-top:13px}.profile-editor,.profile-notice{margin-top:25px}.public-decks-heading{margin-top:35px}.privacy-panel{margin-top:35px}.privacy-panel h3{display:flex;align-items:center;gap:9px;font-size:17px}.privacy-panel p{font-size:12px;color:var(--muted);line-height:1.8;margin-top:12px}@media(max-width:500px){.profile-content{padding:0 20px 25px}.profile-content .btn{font-size:10px;padding:8px 11px}.profile-content .avatar{width:75px;height:75px}.profile-cover{height:105px}}</style>