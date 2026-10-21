import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { initAuth } from './lib/auth'
import { getStaticAuthor } from './lib/static-content'

export const router = createRouter({
  history: import.meta.env.VITE_ROUTER_MODE === 'hash'
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', redirect: '/feed' },
    { path: '/feed', component: () => import('./views/FeedView.vue'), meta: { title: 'Explorer' } },
    { path: '/library', component: () => import('./views/LibraryView.vue'), meta: { private: true, title: 'Bibliothèque' } },
    { path: '/create', component: () => import('./views/EditorView.vue'), meta: { private: true, title: 'Créer un paquet' } },
    { path: '/decks/:id/edit', component: () => import('./views/EditorView.vue'), meta: { private: true, title: 'Modifier un paquet' } },
    { path: '/decks/:id', component: () => import('./views/DeckView.vue'), meta: { title: 'Le paquet' } },
    { path: '/static-author/:username', component: () => import('./views/StaticContentView.vue'), meta: { title: 'Cours statiques' } },
    { path: '/static/:slug', component: () => import('./views/StaticContentView.vue'), meta: { title: 'Publication statique' } },
    { path: '/static/:slug/study', component: () => import('./views/ReviewView.vue'), meta: { title: 'Révision statique' } },
    { path: '/study', component: () => import('./views/StudyView.vue'), meta: { private: true, title: 'Réviser' } },
    { path: '/study/:id', component: () => import('./views/ReviewView.vue'), meta: { private: true, title: 'Ma révision' } },
    { path: '/profile/:username', component: () => import('./views/ProfileView.vue'), meta: { title: 'Profil' } },
    ...['login', 'register', 'forgot-password', 'reset-password', 'recover', 'verify-email'].map(name => ({ path: `/${name}`, component: () => import('./views/AuthView.vue'), meta: { auth: true, title: 'Votre compte' } })),
    { path: '/:pathMatch(.*)*', component: () => import('./views/NotFoundView.vue'), meta: { title: 'Page introuvable' } },
  ],
})
router.beforeEach(async to => {
  await initAuth()
  const username = typeof to.params.username === 'string' ? to.params.username : ''
  if (to.path.startsWith('/profile/') && getStaticAuthor(username)) return `/static-author/${username}`
})
router.afterEach(to => { document.title = `${String(to.meta.title || 'Apprendre')} — Mnemo` })
