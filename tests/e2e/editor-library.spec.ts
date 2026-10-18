import { test, expect } from '@playwright/test'
import { setupApi, sampleDeck, user, list } from './fixtures'

test('éditeur : limite publique dynamique et rejet du brouillon trop long avant toute mutation', async ({ page }) => {
  const mutations = await setupApi(page, true, async (route, path) => {
    if (path === '/config') { await route.fulfill({ json: { cardTextMaxLength: 5 } }); return true }
    return false
  })
  await page.addInitScript(() => {
    localStorage.setItem('mnemo:draft:u1:new', JSON.stringify({ title: 'Brouillon', description: '', subject: '', level: '', chapter: '', visibility: 'private', coverUrl: '', cards: [{ key: 'draft', front: '123456', back: 'R' }] }))
  })
  await page.goto('/create')
  await page.getByRole('button', { name: 'Restaurer le brouillon' }).click()
  await expect(page.getByLabel('Question 1', { exact: true })).toHaveAttribute('maxlength', '5')
  await expect(page.getByLabel('Réponse 1', { exact: true })).toHaveAttribute('maxlength', '5')
  await expect(page.getByText('6 / 5 · 1 / 5 caractères', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Enregistrer le paquet' }).click()
  await expect(page.locator('#front-0-error')).toContainText('5 caractères')
  expect(mutations).toHaveLength(0)
  await page.getByLabel('Question 1', { exact: true }).fill('Q')
  // Un brouillon peut dépasser la limite sur chaque face indépendamment du maxlength natif.
  await page.locator('#back-0').evaluate((element: HTMLTextAreaElement) => {
    element.value = '123456'; element.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.getByRole('button', { name: 'Enregistrer le paquet' }).click()
  await expect(page.locator('#back-0-error')).toContainText('5 caractères')
  expect(mutations).toHaveLength(0)
})

test('éditeur : créer, ordonner, publier et afficher les cartes sans HTML', async ({ page }) => {
  let deck = { ...sampleDeck, _id: 'new-deck', title: '', visibility: 'private', cards: [] as typeof sampleDeck.cards, cardCount: 0 }
  const mutations = await setupApi(page, true, async (route, path, method) => {
    if (path === '/decks' && method === 'POST') { deck = { ...deck, ...route.request().postDataJSON() }; await route.fulfill({ status: 201, json: deck }); return true }
    if (path === '/decks/new-deck') {
      if (method === 'PATCH') deck = { ...deck, ...route.request().postDataJSON() }
      await route.fulfill({ json: deck }); return true
    }
    if (path === '/decks/new-deck/cards' && method === 'POST') {
      const card = { ...route.request().postDataJSON(), _id: `new-card-${deck.cards.length}` }
      deck.cards.push(card); deck.cardCount = deck.cards.length; await route.fulfill({ status: 201, json: card }); return true
    }
    if (path === '/decks/new-deck/cards/order') { await route.fulfill({ json: deck }); return true }
    return false
  })
  await page.goto('/create'); await page.getByLabel('Titre du paquet').fill('Mes idées qui restent')
  await page.getByRole('button', { name: 'Ajouter une carte' }).click()
  await page.getByLabel('Question 1', { exact: true }).fill('<script>ne pas exécuter</script>')
  await page.getByLabel('Réponse 1', { exact: true }).fill('Du texte brut, toujours.')
  await page.getByRole('button', { name: 'Ajouter une carte' }).click()
  await page.getByLabel('Question 2', { exact: true }).fill('La seconde idée ?')
  await page.getByLabel('Réponse 2', { exact: true }).fill('Elle compte aussi.')
  await page.getByRole('button', { name: 'Monter la carte 2' }).click()
  await expect(page.getByLabel('Question 1', { exact: true })).toHaveValue('La seconde idée ?')
  await page.getByLabel('Visibilité', { exact: true }).selectOption('public')
  await page.getByRole('button', { name: 'Enregistrer et publier' }).click()
  await expect(page.getByRole('status')).toContainText('Paquet enregistré')
  const order = mutations.find(mutation => mutation.path.endsWith('/cards/order'))
  expect(order?.body).toEqual({ ids: ['new-card-0', 'new-card-1'] })
  expect(deck.visibility).toBe('public'); expect(deck.cards[0]!.front).toBe('La seconde idée ?')
  await page.getByRole('link', { name: 'Voir le paquet →' }).click()
  await expect(page.getByRole('heading', { name: 'Mes idées qui restent' })).toBeVisible()
  await page.getByRole('button', { name: 'Suivante', exact: true }).click()
  await expect(page.getByText('<script>ne pas exécuter</script>', { exact: true })).toBeVisible()
})

test('éditeur : panne réseau, brouillon récupérable par utilisateur et protection de sortie', async ({ page }) => {
  await setupApi(page, true, async (route, path, method) => {
    if (path === '/decks/d1' && method === 'PATCH') { await route.abort('failed'); return true } return false
  })
  await page.goto('/decks/d1/edit'); await page.getByLabel('Titre du paquet').fill('Une modification à conserver')
  await page.getByRole('button', { name: 'Enregistrer et publier' }).click()
  await expect(page.getByRole('alert')).toContainText('Connexion impossible')
  await expect(page.getByLabel('Titre du paquet')).toHaveValue('Une modification à conserver')
  expect(await page.evaluate(() => localStorage.getItem('mnemo:draft:u1:d1'))).toContain('Une modification à conserver')
  page.once('dialog', dialog => dialog.accept()); await page.reload()
  await page.getByRole('button', { name: 'Restaurer le brouillon' }).click()
  await expect(page.getByLabel('Titre du paquet')).toHaveValue('Une modification à conserver')
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('link', { name: 'Ma bibliothèque', exact: true }).click()
  await expect(page).toHaveURL(/\/decks\/d1\/edit$/)
})

test('bibliothèque : CRUD cours et chapitres, positions et confirmation cascade', async ({ page }) => {
  let course: { _id: string; title: string; description: string; color: string; icon: string } | null = null
  let chapters: { _id: string; title: string; description: string; position: number; course: string }[] = []
  let nextChapter = 1
  const mutations = await setupApi(page, true, async (route, path, method) => {
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body })
    if (path === '/courses' && method === 'GET') { await json(list(course ? [course] : [])); return true }
    if (path === '/courses' && method === 'POST') { course = { ...route.request().postDataJSON(), _id: 'course1' }; await json(course, 201); return true }
    if (path === '/courses/course1' && method === 'PATCH') { Object.assign(course!, route.request().postDataJSON()); await json(course); return true }
    if (path === '/courses/course1' && method === 'DELETE') { course = null; chapters = []; await route.fulfill({ status: 204 }); return true }
    if (path === '/courses/course1/chapters') {
      if (method === 'GET') await json(list([...chapters].sort((a,b) => a.position-b.position)))
      else { const chapter = { ...route.request().postDataJSON(), _id: `ch${nextChapter++}`, course: 'course1' }; chapters.push(chapter); await json(chapter, 201) }
      return true
    }
    if (path.startsWith('/chapters/')) {
      const id = path.split('/')[2]
      if (method === 'DELETE') { chapters = chapters.filter(ch => ch._id !== id); await route.fulfill({ status: 204 }) }
      else { const chapter = chapters.find(ch => ch._id === id)!; Object.assign(chapter, route.request().postDataJSON()); await json(chapter) }
      return true
    }
    if (path === '/decks') { await json(list([])); return true }
    return false
  })
  await page.goto('/library'); await page.getByRole('button', { name: 'Nouveau cours' }).click()
  await page.getByLabel('Titre', { exact: true }).fill('Botanique')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await page.getByRole('button', { name: 'Botanique', exact: true }).click()
  for (const title of ['Les racines', 'Les feuilles']) {
    await page.getByRole('button', { name: 'Ajouter un chapitre' }).click()
    await page.getByLabel('Titre', { exact: true }).fill(title)
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
    await expect(page.getByRole('button', { name: new RegExp(title) }).first()).toBeVisible()
  }
  await page.getByRole('button', { name: 'Monter Les feuilles', exact: true }).click()
  await expect(page.locator('.chapter-title').first()).toContainText('Les feuilles')
  await page.getByRole('button', { name: 'Modifier Les feuilles', exact: true }).click()
  await page.getByLabel('Titre', { exact: true }).fill('La photosynthèse')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.locator('.chapter-title').first()).toContainText('La photosynthèse')
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('historiques associés')
  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
  expect(course).not.toBeNull()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmer', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Chaque apprentissage commence quelque part.' })).toBeVisible()
  expect(mutations.filter(m => m.method === 'DELETE')).toHaveLength(1)
  expect(chapters).toHaveLength(0)
})

test('profil propriétaire : validation puis mise à jour des seules données publiques', async ({ page }) => {
  const mutations = await setupApi(page, true, async (route, path, method) => {
    if (path === '/profiles/camille' && method === 'PATCH') { await route.fulfill({ json: { ...user, ...route.request().postDataJSON(), publicDeckCount: 1, followerCount: 0, followingCount: 0, decks: [sampleDeck], page: 1, hasMore: false } }); return true } return false
  })
  await page.goto('/profile/camille'); await page.getByRole('button', { name: 'Modifier mon profil' }).click()
  await page.getByLabel('Biographie publique').fill('Apprendre à observer les plantes.')
  await page.getByRole('button', { name: 'Enregistrer le profil' }).click()
  await expect(page.getByRole('status')).toContainText('mis à jour')
  expect(mutations.find(mutation => mutation.method === 'PATCH')?.body).toEqual({ displayName: 'Camille Martin', bio: 'Apprendre à observer les plantes.', avatarUrl: '' })
})