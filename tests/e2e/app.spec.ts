import { test, expect } from '@playwright/test'
import { setupApi, sampleDeck, user, list } from './fixtures'

test('fil en invité, aperçu retournable, recherche et social sans connexion', async ({ page }, testInfo) => {
  await setupApi(page, false)
  await page.goto('/feed')
  await expect(page.getByRole('heading', { name: 'La vie secrète des plantes' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('fil.png'), fullPage: true })
  await page.getByRole('button', { name: 'Afficher la réponse' }).click()
  await expect(page.getByText('L’eau et les sels minéraux.', { exact: true })).toBeVisible()
  const searchRequest = page.waitForRequest(request => request.url().includes('/feed?') && request.url().includes('q=plantes'))
  await page.getByRole('searchbox').fill('plantes'); await searchRequest
  await page.getByRole('button', { name: 'Aimer ce paquet' }).click()
  await expect(page.getByRole('button', { name: 'Ne plus aimer' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('region', { name: 'Profil temporaire' })).toBeVisible()
  await expect(page).toHaveURL(/\/feed$/)
})

test('bibliothèque accessible en invité sans détour par login et restauration', async ({ page }) => {
  await setupApi(page, false)
  await page.goto('/library')
  await expect(page).toHaveURL(url => url.pathname === '/library' && !url.search)
  await expect(page.getByRole('heading', { name: 'La bibliothèque.' })).toBeVisible()
  await page.reload(); await expect(page.getByRole('heading', { name: 'La bibliothèque.' })).toBeVisible()
})

test('likes et enregistrements attendent la confirmation API', async ({ page }) => {
  const mutations = await setupApi(page)
  await page.goto('/feed')
  const like = page.getByRole('button', { name: 'Aimer ce paquet' })
  await like.click(); await expect(page.getByRole('button', { name: 'Ne plus aimer' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Enregistré', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(mutations.filter(mutation => mutation.method === 'PUT')).toHaveLength(2)
})

test('révision recto-verso, navigation clavier, résumé unique et un seul POST', async ({ page }) => {
  const mutations = await setupApi(page)
  await page.goto('/study/d1')
  expect(mutations).toHaveLength(0)
  await page.getByRole('button', { name: 'Commencer la révision' }).click()
  await page.locator('main').focus(); await page.keyboard.press('Space')
  await expect(page.getByText('L’eau et les sels minéraux.', { exact: true })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByText('Le rôle du phloème ?', { exact: true })).toBeVisible()
  await expect(page.getByText('Transporter la sève élaborée.', { exact: true })).not.toBeVisible()
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowRight')
  await page.getByRole('button', { name: 'Terminer', exact: true }).click()
  await expect(page.getByText('Session enregistrée dans votre historique.')).toBeVisible()
  const sessions = mutations.filter(mutation => mutation.path.endsWith('/study-sessions'))
  expect(sessions).toHaveLength(1); expect(sessions[0]!.body).toMatchObject({ cardsVisited: 2 })
})

test('révision : échec d’enregistrement, résumé conservé, retry explicite', async ({ page }) => {
  let attempt = 0
  await setupApi(page, true, async (route, path, method) => {
    if (path.endsWith('/study-sessions') && method === 'POST' && attempt++ === 0) { await route.fulfill({ status: 503, json: { message: 'Service temporairement indisponible' } }); return true } return false
  })
  await page.goto('/study/d1'); await page.getByRole('button', { name: 'Commencer la révision' }).click()
  await page.getByRole('button', { name: 'Terminer cette session maintenant' }).click()
  await page.getByRole('button', { name: 'Confirmer', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Un moment bien investi.' })).toBeVisible()
  await page.getByRole('button', { name: 'Réessayer l’enregistrement' }).click()
  await expect(page.getByText('Session enregistrée dans votre historique.')).toBeVisible()
  expect(attempt).toBe(2)
})

test('paquet vide sans démarrage, édition étrangère refusée', async ({ page }) => {
  await setupApi(page, true, async (route, path) => {
    if (path === '/decks/d1') { await route.fulfill({ json: { ...sampleDeck, owner: { ...user, _id: 'u2' }, cards: [], cardCount: 0 } }); return true } return false
  })
  await page.goto('/study/d1'); await expect(page.getByRole('heading', { name: 'Pas de carte, pas de précipitation.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Commencer la révision' })).toHaveCount(0)
  await page.goto('/decks/d1/edit'); await expect(page.getByRole('alert')).toContainText('autre créateur')
  await expect(page.getByLabel('Question 1')).toHaveCount(0)
})

test('erreurs serveur et responsive sans débordement à 360, 768, 1280', async ({ page }) => {
  await setupApi(page, false, async (route, path) => { if (path === '/feed') { await route.fulfill({ status: 503, json: { message: 'La communauté revient bientôt.' } }); return true } return false })
  await page.goto('/feed'); await expect(page.getByRole('alert')).toContainText('La communauté revient bientôt.')
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width === 360) await expect(page.getByRole('navigation', { name: 'Navigation mobile' })).toBeVisible()
  }
})

test('vérification email manuelle et état inscription avec confirmation', async ({ page }) => {
  const mutations = await setupApi(page, false, async (route, path, method) => {
    if (path === '/auth/verify-email' && method === 'POST') { await route.fulfill({ json: { message: 'Adresse confirmée.' } }); return true }
    if (path === '/auth/register') { await route.fulfill({ json: { requiresVerification: true, message: 'Consultez votre messagerie.', devVerificationUrl: 'http://127.0.0.1:5173/verify-email?token=dev' } }); return true }
    return false
  })
  await page.goto('/verify-email?token=test-token')
  await expect(page.getByRole('button', { name: 'Confirmer mon adresse' })).toBeVisible()
  expect(mutations).toHaveLength(0)
  await page.getByRole('button', { name: 'Confirmer mon adresse' }).click()
  await expect(page.getByRole('status')).toHaveText('Adresse confirmée.')
  await page.goto('/register')
  await page.getByLabel('Votre nom').fill('Camille Martin'); await page.getByLabel('Nom d’utilisateur').fill('camille')
  await page.getByLabel('Adresse email').fill('camille@example.fr'); await page.getByLabel('Mot de passe', { exact: true }).fill('une phrase assez longue')
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page.getByText('Consultez votre messagerie.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ouvrir le lien de développement' })).toBeVisible()
  const guestPosts = mutations.filter(m => m.path === '/auth/guest').length
  await page.reload()
  await expect(page.getByRole('status')).toContainText('Inscription en attente')
  await expect(page.getByRole('button', { name: 'Créer mon compte' })).toHaveCount(0)
  expect(mutations.filter(m => m.path === '/auth/guest')).toHaveLength(guestPosts)
})

test('profil public sans données sensibles ni faux abonnement', async ({ page }) => {
  await setupApi(page, false)
  await page.goto('/profile/camille')
  await expect(page.getByRole('heading', { name: 'Camille Martin' })).toBeVisible()
  await expect(page.getByText('Les abonnements ne sont pas inclus')).toBeVisible()
  await expect(page.getByRole('button', { name: /Suivre/ })).toHaveCount(0)
  await expect(page.getByText('camille@example.fr')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Modifier mon profil' })).toHaveCount(0)
})

test('401 global : effacement privé sans invité ni boucle, reprise explicite', async ({ page }) => {
  let expired = true
  const mutations = await setupApi(page, true, async (route, path) => { if (path === '/courses' && expired) { await route.fulfill({ status: 401, json: { message: 'Session expirée' } }); return true } return false })
  await page.goto('/library'); await expect(page.getByRole('alert')).toContainText('session a expiré')
  await expect(page.getByRole('heading', { name: 'La bibliothèque.' })).toHaveCount(0)
  expect(mutations.filter(m => m.path === '/auth/guest')).toHaveLength(0)
  await expect(page.getByRole('button', { name: 'Réessayer en invité' })).toBeVisible()
  expired = false
  await page.getByRole('button', { name: 'Réessayer en invité' }).click()
  await expect(page.getByRole('heading', { name: 'La bibliothèque.' })).toBeVisible()
  expect(mutations.filter(m => m.path === '/auth/guest')).toHaveLength(1)
})

test('pagination réelle du fil et état sans résultat', async ({ page }) => {
  await setupApi(page, false, async (route, path) => {
    if (path !== '/feed') return false
    const url = new URL(route.request().url())
    if (url.searchParams.get('q')) { await route.fulfill({ json: list([]) }); return true }
    const pageNumber = Number(url.searchParams.get('page'))
    await route.fulfill({ json: list([{ _id: `p${pageNumber}`, deck: { ...sampleDeck, _id: `d${pageNumber}`, title: `Découverte ${pageNumber}` }, owner: user, createdAt: '2026-10-18', likeCount: 0, liked: false, saved: false }], pageNumber, pageNumber === 1) }); return true
  })
  await page.goto('/feed'); await page.getByRole('button', { name: 'Charger plus' }).click()
  await expect(page.getByRole('heading', { name: 'Découverte 2' })).toBeVisible()
  await page.getByRole('searchbox').fill('inconnu'); await expect(page.getByRole('heading', { name: 'La découverte se fait attendre.' })).toBeVisible()
})