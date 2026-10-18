import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const guest = { _id: 'g1', username: 'invite', displayName: 'Invité', isGuest: true }
function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status }) }
beforeEach(() => { vi.resetModules(); sessionStorage.clear(); window.history.replaceState({}, '', '/feed') })
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
describe('Initialisation des profils', () => {
  it('partage me puis un seul POST guest entre appels concurrents', async () => {
    const fetcher = vi.fn().mockImplementation(async (path: string) => path.endsWith('/me') ? response({}, 401) : response(guest))
    vi.stubGlobal('fetch', fetcher)
    const { initAuth, ensureGuest, auth } = await import('../../src/lib/auth')
    const first = initAuth(); expect(initAuth()).toBe(first)
    await Promise.all([first, initAuth()])
    await Promise.all([ensureGuest(), ensureGuest()])
    expect(fetcher.mock.calls.map(c => c[0])).toEqual(['/api/auth/me', '/api/auth/guest'])
    expect(fetcher.mock.calls[1]![1]).toMatchObject({ method: 'POST', body: '{}', credentials: 'include' })
    expect(auth.user).toEqual(guest); expect(auth.ready).toBe(true)
  })
  it('partage aussi le POST invité explicite en cours', async () => {
    const fetcher = vi.fn().mockImplementation(async () => response(guest)); vi.stubGlobal('fetch', fetcher)
    const { ensureGuest } = await import('../../src/lib/auth')
    const first = ensureGuest(); expect(ensureGuest()).toBe(first)
    await first; expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each([0, 503])('une panne %s ne fabrique pas de profil et permet un retry', async status => {
    const fetcher = vi.fn().mockImplementation(async () => { if (!status) throw new TypeError('offline'); return response({}, status) })
    vi.stubGlobal('fetch', fetcher)
    const { initAuth, retryAuth, auth } = await import('../../src/lib/auth')
    await initAuth(); expect(auth.user).toBeNull(); expect(auth.error).not.toBe(''); expect(fetcher).toHaveBeenCalledTimes(1)
    fetcher.mockImplementation(async () => response(guest))
    await retryAuth(); expect(auth.user).toEqual(guest); expect(auth.error).toBe('')
  })
  it('guest refusé ne récursive pas et peut être réessayé', async () => {
    const fetcher = vi.fn().mockImplementation(async () => response({}, 401)); vi.stubGlobal('fetch', fetcher)
    const { initAuth, auth, retryAuth } = await import('../../src/lib/auth')
    await initAuth(); expect(fetcher).toHaveBeenCalledTimes(2); expect(auth.user).toBeNull(); expect(auth.error).not.toBe('')
    fetcher.mockImplementation(async () => response(guest)); await retryAuth(); expect(fetcher).toHaveBeenCalledTimes(3)
  })
  it('401 métier efface l’identité sans bootstrap automatique', async () => {
    const fetcher = vi.fn().mockImplementation(async () => response({}, 401)); vi.stubGlobal('fetch', fetcher)
    const { acceptUser, auth, initAuth } = await import('../../src/lib/auth')
    await initAuth(); fetcher.mockClear(); acceptUser(guest)
    const { api } = await import('../../src/lib/api')
    await expect(api('/courses')).rejects.toMatchObject({ status: 401 })
    expect(auth.user).toBeNull(); expect(auth.error).toContain('expiré'); expect(fetcher).toHaveBeenCalledTimes(1)
    await initAuth(); expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each(['/verify-email', '/reset-password', '/forgot-password'])('ne crée pas d’invité sur %s', async path => {
    window.history.replaceState({}, '', path)
    const fetcher = vi.fn().mockImplementation(async () => response({}, 401)); vi.stubGlobal('fetch', fetcher)
    const { initAuth } = await import('../../src/lib/auth'); await initAuth(); expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('mémorise une vérification sans secret et ne reconvertit pas après rechargement', async () => {
    const first = await import('../../src/lib/auth'); first.acceptUser(guest); first.requireVerification()
    expect(first.auth.user).toBeNull(); expect(sessionStorage.getItem('mnemo:verification-pending')).toBe('true')
    vi.resetModules()
    const fetcher = vi.fn().mockImplementation(async () => response({}, 401)); vi.stubGlobal('fetch', fetcher)
    const next = await import('../../src/lib/auth'); await next.initAuth()
    await expect(next.ensureGuest()).rejects.toThrow('Confirmez'); expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('normalise les anciennes projections sans isGuest en profil permanent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => response({ _id: 'old', username: 'old', displayName: 'Ancien' })))
    const { initAuth, auth } = await import('../../src/lib/auth'); await initAuth(); expect(auth.user?.isGuest).toBe(false)
  })
  it('annulation de sortie préserve le profil ; sortie confirmée ne crée aucun invité', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 })); vi.stubGlobal('fetch', fetcher)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { acceptUser, auth, logout } = await import('../../src/lib/auth'); acceptUser(guest)
    expect(await logout()).toBe(false); expect(auth.user?._id).toBe('g1'); expect(fetcher).not.toHaveBeenCalled()
    confirm.mockReturnValue(true); expect(await logout()).toBe(true); expect(auth.user).toBeNull(); expect(fetcher).toHaveBeenCalledTimes(1)
  })
})