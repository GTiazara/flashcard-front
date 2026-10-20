import { test, expect, type Page } from '@playwright/test'
import { setupApi, guest, user, sampleDeck, list } from './fixtures'
import type { Deck, User } from '../../src/types'

async function guestContract(page: Page) {
  let active: User | null = null, retained: User | null = null, counter = 0
  const decks: Deck[] = []
  const mutations = await setupApi(page, false, async (route, path, method) => {
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body })
    const owned = () => decks.filter(deck => deck.owner === active?._id)
    if (path === '/auth/me') { await json(active ?? { message: 'Session absente' }, active ? 200 : 401); return true }
    if (path === '/auth/guest') {
      retained ??= { ...guest, _id: `g${++counter}`, username: `invite_${counter}` }; active = retained
      await json(active); return true
    }
    if (path === '/auth/register') {
      const body = route.request().postDataJSON()
      active = { ...active!, ...body, isGuest: false }; retained = null
      await json(active, 201); return true
    }
    if (path === '/auth/login') { active = user; retained = null; await json(active); return true }
    if (path === '/auth/logout') { active = null; retained = null; await route.fulfill({ status: 204 }); return true }
    if (path === '/decks') {
      if (method === 'GET') await json(list(owned()))
      else { const deck: Deck = { ...sampleDeck, ...route.request().postDataJSON(), _id: `d${decks.length + 1}`, owner: active!._id, cards: [], cardCount: 0 }; decks.push(deck); await json(deck, 201) }
      return true
    }
    if (path.startsWith('/decks/')) {
      const deck = owned().find(item => item._id === path.split('/')[2])
      if (!deck) { await json({ message: 'Paquet introuvable' }, 404); return true }
      if (path.endsWith('/cards') && method === 'POST') {
        const card = { ...route.request().postDataJSON(), _id: `c${deck.cards!.length}` }
        deck.cards!.push(card); deck.cardCount = deck.cards!.length; await json(card, 201)
      } else { if (method === 'PATCH') Object.assign(deck, route.request().postDataJSON()); await json(deck) }
      return true
    }
    if (path.startsWith('/profiles/') && active?.username === path.split('/')[2]) {
      await json({ ...active, publicDeckCount: 0, decks: [], page: 1, hasMore: false }); return true
    }
    return false
  })
  return { mutations, decks, current: () => active, expireSession: () => { active = null } }
}
async function createPrivate(page: Page) {
  await page.goto('/library')
  await expect(page.getByRole('heading', { name: 'La bibliothèque.' })).toBeVisible()
  await page.getByRole('link', { name: 'Nouveau paquet', exact: true }).click()
  await page.getByLabel('Titre du paquet').fill('Mes cartes temporaires')
  await page.getByRole('button', { name: 'Ajouter une carte' }).click()
  await page.getByLabel('Question 1', { exact: true }).fill('Une question ?')
  await page.getByLabel('Réponse 1', { exact: true }).fill('Une réponse.')
  await page.getByRole('button', { name: 'Enregistrer le paquet', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Paquet enregistré')
}

test('invité : création sans login, restauration cookie, conversion même identité, sortie et isolation', async ({ page }) => {
  const state = await guestContract(page)
  await createPrivate(page)
  const originalId = state.current()!._id
  expect(state.decks[0]!.owner).toBe(originalId)
  state.expireSession() // Cookie durable conservé, session courte perdue.
  await page.reload()
  await expect(page.getByRole('region', { name: 'Profil temporaire' })).toBeVisible()
  expect(state.current()!._id).toBe(originalId)
  await page.getByRole('link', { name: 'Conserver mon profil', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Conserver mon profil', exact: true })).toBeVisible()
  await page.getByLabel('Pseudo').fill('convertie')
  await page.getByLabel('Mot de passe', { exact: true }).fill('une phrase assez longue')
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page.getByRole('searchbox')).toBeVisible()
  expect(state.current()).toMatchObject({ _id: originalId, isGuest: false })
  await expect(page.getByRole('region', { name: 'Profil temporaire' })).toHaveCount(0)
  await page.goto('/profile/convertie')
  await expect(page.getByRole('heading', { name: 'Curieux temporaire', exact: true })).toBeVisible()
  await expect(page.getByText('Votre accès dépend du cookie')).toHaveCount(0)
  await page.goto('/library'); await page.getByRole('button', { name: 'Paquets', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Mes cartes temporaires', exact: true })).toBeVisible()
  await page.goto('/profile/convertie')
  await page.locator('main').getByRole('button', { name: 'Quitter ce profil' }).click()
  await expect(page).toHaveURL(/\/login$/)
  const before = state.mutations.filter(m => m.path === '/auth/guest').length
  await page.getByRole('button', { name: 'Recommencer en invité' }).click()
  await expect(page.getByRole('region', { name: 'Profil temporaire' })).toBeVisible()
  expect(state.current()!._id).not.toBe(originalId)
  expect(state.mutations.filter(m => m.path === '/auth/guest')).toHaveLength(before + 1)
  await page.goto('/library'); await page.getByRole('button', { name: 'Paquets', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'La prochaine idée vous appartient.', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mes cartes temporaires', exact: true })).toHaveCount(0)
  await page.goto('/decks/d1'); await expect(page.getByRole('alert')).toContainText('introuvable')
  await page.goto('/create'); await expect(page.getByRole('button', { name: 'Restaurer le brouillon' })).toHaveCount(0)
})

test('connexion existante : navigation sans perte, puis aucun transfert du contenu invité', async ({ page }) => {
  const state = await guestContract(page)
  await createPrivate(page)
  const originalId = state.current()!._id
  await page.getByRole('link', { name: 'Voir le paquet →' }).click()
  await page.goto('/login')
  await expect(page.getByText('Se connecter à un compte existant ne fusionne pas')).toBeVisible()
  expect(state.current()!._id).toBe(originalId)
  await page.getByRole('button', { name: 'Continuer sans compte' }).click()
  await expect(page.getByRole('searchbox')).toBeVisible(); expect(state.current()!._id).toBe(originalId)
  await page.goto('/login')
  await page.getByLabel('Pseudo ou email').fill('camille@example.test')
  await page.getByLabel('Mot de passe', { exact: true }).fill('une phrase assez longue')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await expect(page.getByRole('searchbox')).toBeVisible()
  expect(state.current()!._id).toBe(user._id); expect(state.decks[0]!.owner).toBe(originalId)
  await page.goto('/library'); await page.getByRole('button', { name: 'Paquets', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'La prochaine idée vous appartient.', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mes cartes temporaires', exact: true })).toHaveCount(0)
})

test('panne au bootstrap : erreur réelle et retry unique sans faux profil', async ({ page }) => {
  let down = true, guests = 0
  await setupApi(page, false, async (route, path) => {
    if (path === '/auth/me' && down) { await route.abort(); return true }
    if (path === '/auth/guest') { guests++; await route.fulfill({ json: guest }); return true }
    return false
  })
  await page.goto('/library')
  await expect(page.getByRole('alert')).toContainText('Connexion impossible')
  expect(guests).toBe(0)
  await expect(page.getByRole('region', { name: 'Profil temporaire' })).toHaveCount(0)
  down = false; await page.getByRole('button', { name: 'Réessayer en invité' }).click()
  await expect(page.getByRole('heading', { name: 'La bibliothèque.' })).toBeVisible(); expect(guests).toBe(1)
})

test('sortie invitée : avertissement, annulation sans perte, puis nouveau profil uniquement sur action', async ({ page }) => {
  const state = await guestContract(page)
  await page.goto('/feed')
  await expect(page.getByRole('region', { name: 'Profil temporaire' })).toBeVisible()
  const original = state.current()!
  await page.goto(`/profile/${original.username}`)
  await expect(page.getByText('Votre accès dépend du cookie')).toBeVisible()
  page.once('dialog', async dialog => { expect(dialog.message()).toContain('perdre définitivement'); await dialog.dismiss() })
  await page.locator('main').getByRole('button', { name: 'Quitter ce profil' }).click()
  expect(state.current()!._id).toBe(original._id)
  expect(state.mutations.filter(m => m.path === '/auth/logout')).toHaveLength(0)
  page.once('dialog', dialog => dialog.accept())
  await page.locator('main').getByRole('button', { name: 'Quitter ce profil' }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(state.current()).toBeNull()
  expect(state.mutations.filter(m => m.path === '/auth/guest')).toHaveLength(1)
  await page.getByRole('button', { name: 'Recommencer en invité' }).click()
  await expect(page.getByRole('region', { name: 'Profil temporaire' })).toBeVisible()
  expect(state.current()!._id).not.toBe(original._id)
})