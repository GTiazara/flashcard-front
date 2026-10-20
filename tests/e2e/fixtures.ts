import { expect, type Page, type Route } from '@playwright/test'
export const user = { _id: 'u1', username: 'camille', displayName: 'Camille Martin', isGuest: false, bio: '', avatarUrl: '' }
export const guest = { ...user, _id: 'guest1', username: 'invite_1', displayName: 'Curieux temporaire', isGuest: true }
export const cards = [{ _id: 'c1', front: 'Que transporte le xylème ?', back: 'L’eau et les sels minéraux.', position: 0 }, { _id: 'c2', front: 'Le rôle du phloème ?', back: 'Transporter la sève élaborée.', position: 1 }]
export const sampleDeck = { _id: 'd1', title: 'La vie secrète des plantes', description: 'Comprendre ce qui pousse autour de nous.', subject: 'Biologie', level: 'Découverte', visibility: 'public', chapter: null, owner: user, cardCount: 2, cards, preview: cards[0] }
export function list<T>(items: T[], page = 1, hasMore = false) { return { items, page, hasMore } }
export async function setupApi(page: Page, authenticated = true, custom?: (route: Route, path: string, method: string) => Promise<boolean>) {
  const mutations: { path: string; method: string; body: unknown }[] = []
  let loggedIn = authenticated
  let currentUser = user
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.slice(4), method = request.method()
    if (method !== 'GET') {
      expect(request.headers()['content-type']).toContain('application/json')
      mutations.push({ path, method, body: request.postDataJSON() })
    }
    if (custom && await custom(route, path, method)) return
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body })
    if (path === '/config') { await json({ cardTextMaxLength: 10000 }); return }
    if (path === '/auth/me') { await json(loggedIn ? currentUser : { message: 'Non connecté' }, loggedIn ? 200 : 401); return }
    if (path === '/auth/recovery' && method === 'GET') { await json({ url: `http://127.0.0.1:5173/recover?token=${'ab'.repeat(32)}`, hasEmail: Boolean(currentUser && !currentUser.isGuest) }); return }
    if (path === '/auth/guest') { loggedIn = true; currentUser = guest; await json(currentUser); return }
    if (path === '/auth/login' || path === '/auth/register') { loggedIn = true; currentUser = path === '/auth/register' && currentUser.isGuest ? { ...user, _id: currentUser._id } : user; await json(currentUser); return }
    if (path === '/auth/logout') { loggedIn = false; await route.fulfill({ status: 204 }); return }
    if (path === '/feed') { await json(list([{ _id: 'p1', deck: sampleDeck, owner: user, createdAt: '2026-10-18T12:00:00Z', likeCount: 3, liked: false, saved: false }])); return }
    if (path === '/decks/d1') { await json(sampleDeck); return }
    if (path === '/decks' || path === '/saved') { await json(list([sampleDeck])); return }
    if (path === '/courses' || path.includes('/chapters') || path === '/study-sessions') { await json(list([])); return }
    if (path === '/publications/p1/like') { const body = request.postDataJSON(); await json({ liked: body.liked, likeCount: body.liked ? 4 : 3 }); return }
    if (path === '/decks/d1/save') { await json({ saved: request.postDataJSON().saved }); return }
    if (path === '/decks/d1/study-sessions') { await json({ _id: 'session1', ...request.postDataJSON() }, 201); return }
    if (path === '/profiles/camille') { await json({ ...user, publicDeckCount: 1, followerCount: 0, followingCount: 0, decks: [sampleDeck], page: 1, hasMore: false }); return }
    await json({ message: `Route de test non prévue : ${method} ${path}` }, 404)
  })
  return mutations
}