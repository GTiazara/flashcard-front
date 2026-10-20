import { test, expect } from '@playwright/test'
import { setupApi } from './fixtures'

test('connexion refusée : message conservé et formulaire non effacé', async ({ page }) => {
  await setupApi(page, false, async (route, path) => {
    if (path === '/auth/login') { await route.fulfill({ status: 401, json: { message: 'Email ou mot de passe incorrect.' } }); return true } return false
  })
  await page.goto('/login')
  await page.getByLabel('Pseudo ou email').fill('camille@example.fr')
  await page.getByLabel('Mot de passe', { exact: true }).fill('un mauvais mot de passe')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Email ou mot de passe incorrect.')
  await expect(page.getByLabel('Pseudo ou email')).toHaveValue('camille@example.fr')
  await expect(page.getByLabel('Mot de passe', { exact: true })).toHaveValue('un mauvais mot de passe')
})

test('récupération : réponse générique sans lien inventé, lien seulement si retourné', async ({ page }) => {
  let includeLink = false
  await setupApi(page, false, async (route, path) => {
    if (path === '/auth/forgot-password') {
      await route.fulfill({ json: { message: 'Si ce compte existe, un lien vous a été envoyé.', ...(includeLink ? { devResetUrl: 'http://127.0.0.1:5173/reset-password?token=development' } : {}) } }); return true
    } return false
  })
  await page.goto('/forgot-password'); await page.getByLabel('Adresse email').fill('inconnu@example.fr')
  await page.getByRole('button', { name: 'Recevoir un lien' }).click()
  await expect(page.getByRole('status')).toContainText('Si ce compte existe')
  await expect(page.getByRole('link', { name: 'Ouvrir le lien de développement' })).toHaveCount(0)
  includeLink = true
  await page.goto('/forgot-password'); await page.getByLabel('Adresse email').fill('camille@example.fr')
  await page.getByRole('button', { name: 'Recevoir un lien' }).click()
  await expect(page.getByRole('link', { name: 'Ouvrir le lien de développement' })).toHaveAttribute('href', /token=development/)
})

test('reset : limites UTF-8, erreur de champ serveur et succès sans connexion automatique', async ({ page }) => {
  let attempts = 0
  const mutations = await setupApi(page, false, async (route, path) => {
    if (path === '/auth/reset-password') {
      attempts++
      if (attempts === 1) await route.fulfill({ status: 400, json: { message: 'Un champ doit être corrigé.', errors: [{ path: 'password', message: 'Choisissez un mot de passe différent.' }] } })
      else await route.fulfill({ json: { message: 'Mot de passe modifié. Connectez-vous à nouveau.' } })
      return true
    } return false
  })
  await page.goto('/reset-password?token=valid-token')
  await page.getByLabel('Mot de passe', { exact: true }).fill('é'.repeat(37))
  await page.getByRole('button', { name: 'Enregistrer le mot de passe' }).click()
  await expect(page.getByText('Le mot de passe ne doit pas dépasser 72 octets UTF-8.')).toBeVisible()
  expect(mutations).toHaveLength(0)
  await page.getByLabel('Mot de passe', { exact: true }).fill('un nouveau mot de passe')
  await page.getByRole('button', { name: 'Enregistrer le mot de passe' }).click()
  await expect(page.getByLabel('Mot de passe', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Choisissez un mot de passe différent.')).toBeVisible()
  await page.getByLabel('Mot de passe', { exact: true }).fill('une autre phrase très longue')
  await page.getByRole('button', { name: 'Enregistrer le mot de passe' }).click()
  await expect(page.getByRole('status')).toContainText('Mot de passe modifié')
  expect(mutations.map(m => m.path)).toEqual(['/auth/reset-password', '/auth/reset-password'])
})