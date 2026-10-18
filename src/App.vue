<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Compass, LibraryBig, Plus, Brain, UserRound, LogOut, Sparkles, ArrowUpRight, BookOpen, Heart } from 'lucide-vue-next'
import { auth, logout, retryAuth, verificationPending } from './lib/auth'
import { errorMessage } from './lib/api'
import Avatar from './components/Avatar.vue'
const route = useRoute(), router = useRouter(), logoutError = ref('')
const links = computed(() => [
  { to: '/feed', label: 'Explorer', icon: Compass }, { to: '/library', label: 'Bibliothèque', icon: LibraryBig },
  { to: '/create', label: 'Créer', icon: Plus }, { to: '/study', label: 'Réviser', icon: Brain },
  { to: auth.user ? `/profile/${auth.user.username}` : '/login', label: 'Mon profil', icon: UserRound },
])
const retrying = ref(false)
async function retry() { retrying.value = true; try { await retryAuth() } finally { retrying.value = false } }
async function signOut() { try { if (await logout()) await router.push('/login') } catch (err) { logoutError.value = errorMessage(err) } }
</script>
<template>
  <a class="skip-link" href="#main">Aller au contenu</a>
  <aside class="sidebar">
    <RouterLink to="/feed" class="brand" aria-label="Mnemo, accueil"><span class="brand-icon"><BookOpen :size="25" /></span>mnemo<span class="brand-dot">.</span></RouterLink>
    <p class="brand-tagline">Le plaisir de retenir.</p>
    <nav aria-label="Navigation principale"><RouterLink v-for="link in links" :key="link.to" :to="link.to" class="nav-link" :class="{ 'nav-create': link.to === '/create' }"><component :is="link.icon" :size="21" /><span>{{ link.label }}</span><span v-if="link.to === '/create'" class="nav-plus">+</span></RouterLink></nav>
    <div class="sidebar-note"><Sparkles :size="21" /><strong>Un peu chaque jour,<br />beaucoup pour demain.</strong><p>Vos idées méritent de rester.</p></div>
    <div class="sidebar-bottom"><p class="subtle"><Heart :size="13" /> Pensé pour les esprits curieux</p><RouterLink v-if="auth.user" :to="`/profile/${auth.user.username}`" class="account"><Avatar :name="auth.user.displayName" :url="auth.user.avatarUrl" /><span><strong>{{ auth.user.displayName }}</strong><small>{{ auth.user.isGuest ? 'Profil temporaire' : `@${auth.user.username}` }}</small></span></RouterLink><button v-if="auth.user" class="logout" @click="signOut"><LogOut :size="16" /> Quitter ce profil</button><RouterLink v-else to="/login" class="btn btn-secondary">Se connecter <ArrowUpRight :size="16" /></RouterLink><p v-if="logoutError" role="alert" class="field-error">{{ logoutError }}</p></div>
  </aside>
  <div class="app-content">
    <header class="topbar"><span class="breadcrumb">Votre espace pour apprendre <span>/</span> <strong>{{ route.meta.title }}</strong></span><RouterLink to="/feed" class="mobile-brand brand"><BookOpen :size="23" />mnemo.</RouterLink><div class="topbar-right"><span class="little-dot"></span><span class="topbar-motto">Chaque découverte compte.</span><RouterLink v-if="auth.user" :to="`/profile/${auth.user.username}`" :aria-label="`Profil de ${auth.user.displayName}`"><Avatar :name="auth.user.displayName" :url="auth.user.avatarUrl" /></RouterLink><RouterLink v-else to="/login" class="login-link">Connexion <ArrowUpRight :size="15" /></RouterLink></div></header>
    <main id="main" tabindex="-1">
      <section v-if="auth.ready && (auth.error || (!auth.user && !route.meta.auth))" class="surface panel stack">
        <h1>{{ verificationPending() ? 'Confirmez votre adresse.' : 'Votre espace est en pause.' }}</h1>
        <p v-if="auth.error" role="alert" class="alert">{{ auth.error }}</p>
        <p v-else>{{ verificationPending() ? 'Consultez votre messagerie puis connectez-vous. Votre profil ne sera pas reconverti.' : 'Vous avez quitté ce profil. Vous pouvez commencer un nouveau profil temporaire.' }}</p>
        <button v-if="!verificationPending()" class="btn btn-primary" :disabled="retrying" @click="retry">{{ auth.error ? 'Réessayer en invité' : 'Recommencer en invité' }}</button>
        <RouterLink to="/login" class="login-link">Se connecter à un compte existant</RouterLink>
      </section>
      <section v-if="auth.user?.isGuest" class="notice guest-notice" aria-label="Profil temporaire"><div><strong>Profil temporaire</strong><p>{{ auth.user.displayName }} · Retrouvez ce profil grâce au cookie de ce navigateur.</p></div><RouterLink to="/register" class="btn btn-secondary">Conserver mon profil</RouterLink><RouterLink to="/login" class="login-link">Connexion</RouterLink></section>
      <RouterView v-if="auth.ready && (!auth.error || route.meta.auth) && (!route.meta.private || auth.user)" v-slot="{ Component }"><component :is="Component" :key="route.meta.auth ? route.path : `${route.path}:${auth.generation}`" /></RouterView>
      <p v-else-if="!auth.ready" class="loading" role="status"><span class="spinner"></span>Ouverture de votre espace…</p>
    </main>
    <footer class="page-footer">Mnemo <span>·</span> Apprendre, à votre rythme.</footer>
  </div>
  <nav class="mobile-nav" aria-label="Navigation mobile"><RouterLink v-for="link in links" :key="link.to" :to="link.to"><component :is="link.icon" :size="22" /><span>{{ link.label === 'Bibliothèque' ? 'Mes paquets' : link.label }}</span></RouterLink></nav>
</template>
<style scoped>
.guest-notice { display:flex; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:24px; }
.guest-notice div { flex:1 1 220px; min-width:0; overflow-wrap:anywhere; }
.guest-notice p { font-size:12px; margin-top:6px; }
</style>