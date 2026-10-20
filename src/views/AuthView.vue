<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, BookOpen, ShieldCheck } from 'lucide-vue-next'
import { api, errorMessage, fieldErrors, passwordError, safeRedirect } from '../lib/api'
import { auth, acceptUser, clearAuth, ensureGuest, requireVerification, verificationPending } from '../lib/auth'
import type { Message, User, Verification } from '../types'
import UiButton from '../components/UiButton.vue'
import UiField from '../components/UiField.vue'
const route = useRoute(), router = useRouter()
const mode = computed(() => route.path.slice(1))
const form = reactive({ email: '', password: '', username: '', identifier: '' })
const busy = ref(false), error = ref(''), errors = ref<Record<string,string>>({}), message = ref(''), devUrl = ref(''), done = ref(false), recoveryLink = ref('')
const titles: Record<string, [string, string]> = {
  login: ['Heureux de vous retrouver.', 'Vos prochaines découvertes vous attendent.'],
  register: ['Faites place à la curiosité.', 'Un pseudo et un mot de passe. Pas d’email, pas de nom, pas d’image.'],
  'forgot-password': ['Compte créé avec un email.', 'Les nouveaux comptes se récupèrent avec le lien enregistré dans le profil. Cette page reste réservée aux comptes qui ont déjà une adresse email.'],
  'reset-password': ['Votre nouveau mot de passe.', 'Choisissez une phrase longue et unique.'],
  recover: ['Retrouver l’accès.', 'Ce lien, enregistré depuis votre profil, choisit un nouveau mot de passe. Conservez-le ensuite : il reste valable.'],
  'verify-email': ['Confirmez votre adresse.', 'Cliquez ci-dessous pour confirmer votre email. Le lien n’est utilisé qu’à votre demande.'],
}
const title = computed(() => mode.value === 'register' && auth.user?.isGuest ? ['Conserver mon profil', 'Choisissez un pseudo et un mot de passe. Le lien de récupération s’affiche juste après : copiez-le dans un endroit sûr.'] : titles[mode.value] || titles.login!)
const needsPassword = computed(() => ['login', 'register', 'reset-password', 'recover'].includes(mode.value))
const buttonText = computed(() => ({ login: 'Se connecter', register: 'Créer mon compte', 'forgot-password': 'Recevoir un lien', 'reset-password': 'Enregistrer le mot de passe', recover: 'Enregistrer le mot de passe', 'verify-email': 'Confirmer mon adresse' })[mode.value])
function selectLink(event: FocusEvent) { const input = event.target; if (input instanceof HTMLInputElement) input.select() }
async function copyLink() {
  if (!recoveryLink.value) return
  try { await navigator.clipboard.writeText(recoveryLink.value); message.value = 'Lien copié. Placez-le dans un endroit sûr.' }
  catch { message.value = 'Sélectionnez le lien et copiez-le dans un endroit sûr.' }
}
async function finishRegister() {
  const next = auth.user ? safeRedirect(route.query.redirect) : '/login'
  recoveryLink.value = ''
  await router.replace(next)
}
async function continueGuest() {
  busy.value = true; error.value = ''
  try { await ensureGuest(); await router.push('/feed') } catch (err) { error.value = errorMessage(err) } finally { busy.value = false }
}
async function submit() {
  if (busy.value) return
  errors.value = {}; error.value = ''; message.value = ''; devUrl.value = ''
  if (['register','reset-password','recover'].includes(mode.value)) { const issue = passwordError(form.password); if (issue) errors.value.password = issue }
  if (mode.value === 'register' && !/^[a-z0-9_]{3,24}$/.test(form.username.trim().toLowerCase())) errors.value.username = 'De 3 à 24 caractères : lettres minuscules, chiffres et tiret bas.'
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  if (['reset-password','verify-email','recover'].includes(mode.value) && !token) { error.value = 'Ce lien est incomplet. Utilisez le lien enregistré dans votre profil.'; return }
  if (Object.keys(errors.value).length) return
  busy.value = true
  try {
    if (mode.value === 'login' || mode.value === 'register') {
      const identifier = form.identifier.trim()
      const login = identifier.includes('@') ? { email: identifier.toLowerCase(), password: form.password } : { username: identifier.toLowerCase(), password: form.password }
      const body = mode.value === 'login' ? login : { username: form.username.trim().toLowerCase(), password: form.password }
      const result = await api<(User & { recoveryUrl?: string }) | Verification>(`/auth/${mode.value}`, 'POST', body)
      form.password = ''
      if ('requiresVerification' in result && result.requiresVerification) { requireVerification(); message.value = result.message; devUrl.value = import.meta.env.DEV ? result.devVerificationUrl || '' : ''; recoveryLink.value = result.recoveryUrl || ''; done.value = true }
      else {
        const { recoveryUrl: link, ...account } = result as User & { recoveryUrl?: string }
        acceptUser(account)
        if (link) recoveryLink.value = link
        else await router.replace(safeRedirect(route.query.redirect))
      }
    } else {
      const path = mode.value === 'recover' ? 'recover' : mode.value
      const body = mode.value === 'forgot-password' ? { email: form.email.trim().toLowerCase() } : mode.value === 'verify-email' ? { token } : { token, password: form.password }
      const result = await api<Message>(`/auth/${path}`, 'POST', body)
      message.value = result.message; done.value = true; form.password = ''
      devUrl.value = import.meta.env.DEV ? result.devResetUrl || '' : ''
      if (mode.value === 'reset-password' || mode.value === 'recover') clearAuth()
    }
  } catch (err) { error.value = errorMessage(err); errors.value = fieldErrors(err) }
  finally { busy.value = false }
}
</script>
<template>
  <div class="auth-layout">
    <section class="auth-story"><div class="story-mark"><BookOpen :size="36" /></div><p class="eyebrow">BIENVENUE CHEZ MNEMO</p><h1>Les grandes idées<br />commencent par<br /><em>une petite carte.</em></h1><p>Créez, révisez, partagez.<br />Et redécouvrez le plaisir de retenir.</p><div class="story-decoration" aria-hidden="true"><span>Aa</span><span>↗</span><span>✦</span></div><small><ShieldCheck :size="15" /> Vos connaissances. Votre rythme.</small></section>
    <section class="auth-form surface"><p class="eyebrow">VOTRE ESPACE</p><h2>{{ title[0] }}</h2><p class="auth-intro">{{ title[1] }}</p>
      <p v-if="error" role="alert" class="alert">{{ error }}</p>
      <p v-if="message" role="status" class="notice success">{{ message }}</p>
      <div v-if="devUrl" class="notice"><strong>Développement uniquement</strong><p>Lien renvoyé par l’API, sans envoi SMTP :</p><a :href="devUrl" class="dev-link" rel="noreferrer">Ouvrir le lien de développement</a></div>
      <p v-if="mode === 'login' && auth.user?.isGuest" class="notice">Se connecter à un compte existant ne fusionne pas les profils : le contenu temporaire ne sera pas transféré. Pour le conserver, choisissez « Conserver mon profil ». Naviguer ici ne quitte pas votre profil.</p>
      <p v-if="mode === 'register' && verificationPending()" class="notice" role="status">Inscription en attente : consultez votre messagerie, confirmez votre adresse puis connectez-vous.</p>
      <div v-if="recoveryLink" class="recovery-save stack" role="status"><strong>Enregistrez ce lien maintenant.</strong><p>Il réinitialise le mot de passe. Copiez-le dans un endroit sûr (gestionnaire de mots de passe ou note hors ligne). Vous pourrez le revoir dans votre profil.</p><input class="recovery-url" readonly :value="recoveryLink" aria-label="Lien de récupération" @focus="selectLink" /><UiButton type="button" variant="secondary" @click="copyLink">Copier le lien</UiButton><UiButton type="button" @click="finishRegister">J’ai copié le lien</UiButton></div>
      <form v-else-if="!done && !(mode === 'register' && verificationPending())" class="stack" @submit.prevent="submit">
        <UiField v-if="mode === 'register'" v-model="form.username" label="Pseudo" name="username" required minlength="3" maxlength="24" autocomplete="username" hint="Lettres minuscules, chiffres et tiret bas, 3 à 24 caractères. Il sert aussi de nom affiché." :error="errors.username" />
        <UiField v-if="mode === 'login'" v-model="form.identifier" label="Pseudo ou email" name="identifier" required autocomplete="username" hint="Un compte déjà créé avec un email peut encore se connecter avec cette adresse." :error="errors.identifier" />
        <UiField v-if="mode === 'forgot-password'" v-model="form.email" label="Adresse email" name="email" type="email" required autocomplete="email" :error="errors.email" placeholder="vous@exemple.fr" />
        <UiField v-if="needsPassword" v-model="form.password" label="Mot de passe" name="password" type="password" required :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" :hint="mode === 'login' ? undefined : '12 caractères minimum, 72 octets UTF-8 maximum.'" :error="errors.password" />
        <RouterLink v-if="mode === 'login'" to="/forgot-password" class="auth-forgot">Compte avec email : mot de passe oublié</RouterLink>
        <UiButton type="submit" :busy="busy">{{ buttonText }} <ArrowRight :size="16" /></UiButton>
      </form>
      <UiButton v-if="mode === 'login' && !verificationPending()" variant="secondary" :busy="busy" @click="continueGuest">{{ auth.stopped ? 'Recommencer en invité' : 'Continuer sans compte' }}</UiButton>
      <p v-if="mode === 'login'" class="auth-switch">Pas encore de compte ? <RouterLink :to="{ path: '/register', query: { redirect: route.query.redirect } }">Rejoindre Mnemo</RouterLink></p>
      <p v-else class="auth-switch"><RouterLink to="/login">Retour à la connexion</RouterLink></p>
      <p class="auth-privacy">La création demande seulement un pseudo et un mot de passe. Les informations déjà présentes sur un ancien compte restent en base.</p>
    </section>
  </div>
</template>
<style scoped>
.auth-layout { display:grid; grid-template-columns:1fr 1.05fr; gap:40px; align-items:center; max-width:1000px; margin:25px auto; }.auth-story { padding:20px 10px; }.story-mark { color:#8c78c7; margin-bottom:30px; }.auth-story h1 { font-size:36px; line-height:1.3; }.auth-story h1 em { font-family:Georgia,serif; color:#7963b8; font-weight:400; }.auth-story>p:not(.eyebrow) { color:#82768f; margin-top:25px; font-size:14px; line-height:1.9; }.story-decoration { display:flex; gap:10px; margin:30px 0; }.story-decoration span { display:grid; place-items:center; border:1px solid #e8dff2; border-radius:15px; background:#f3eef9; color:#9c88b9; width:65px; height:75px; transform:rotate(-8deg); font:30px Georgia,serif; }.story-decoration span:nth-child(2) { transform:rotate(8deg); background:#f8eee6; color:#c09c80; }.auth-story small { display:flex; align-items:center; gap:8px; font-size:11px; }.auth-form { padding:35px; display:grid; gap:20px; }.auth-form h2 { font-size:27px; line-height:1.3; }.auth-form .eyebrow { margin:0; }.auth-intro { font-size:13px; color:var(--muted); margin-top:-8px; }.auth-forgot { font-size:12px; color:#6c5ce7; text-align:right; margin-top:-10px; }.auth-switch { font-size:12px; text-align:center; color:var(--muted); }.auth-switch a,.dev-link { color:#6550c3; font-weight:650; text-decoration:underline; text-underline-offset:3px; }.auth-privacy { text-align:center; font-size:10px; color:#8d8699; padding-top:15px; border-top:1px solid var(--border); }@media(max-width:1050px){.auth-layout{gap:22px}.auth-story h1{font-size:30px}.auth-form{padding:26px}}@media(max-width:850px){.auth-layout{grid-template-columns:1fr;max-width:460px;margin:0 auto}.auth-story{display:none}}
.auth-privacy { color: #776d84; }
.recovery-save strong { font-size: 16px; }
.recovery-save p { font-size: 13px; color: var(--muted); }
.recovery-url { font-size: 12px; }
</style>