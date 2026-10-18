import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, fieldErrors, invalidateIdentityRequests, onUnauthorized, passwordError, safeRedirect } from '../../src/lib/api'

afterEach(() => { vi.unstubAllGlobals(); onUnauthorized(() => undefined) })
describe('Contrat HTTP', () => {
  it('envoie les cookies et retourne les objets directs', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ _id: '123' }), { status: 200 }))
    vi.stubGlobal('fetch', fetcher)
    expect(await api('/decks/123')).toEqual({ _id: '123' })
    expect(fetcher).toHaveBeenCalledWith('/api/decks/123', expect.objectContaining({ credentials: 'include', method: 'GET' }))
    expect(fetcher.mock.calls[0]![1]).not.toHaveProperty('body')
  })
  it.each(['POST', 'PATCH', 'PUT', 'DELETE'])('envoie toujours du JSON pour %s', async method => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetcher)
    await expect(api('/resource', method)).resolves.toBeUndefined()
    expect(fetcher).toHaveBeenCalledWith('/api/resource', expect.objectContaining({ method, body: '{}', headers: expect.objectContaining({ 'Content-Type': 'application/json' }) }))
  })
  it('gère les erreurs de champs sans perdre leurs chemins', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'À corriger', errors: [{ path: 'body.title', message: 'Titre requis' }] }), { status: 400 })))
    try { await api('/decks', 'POST', {}) } catch (err) { expect(err).toBeInstanceOf(ApiError); expect(fieldErrors(err)).toEqual({ title: 'Titre requis' }); return }
    throw new Error('Erreur attendue')
  })
  it('invalide globalement l’identité sur 401', async () => {
    const clear = vi.fn(); onUnauthorized(clear)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"message":"Session expirée"}', { status: 401 })))
    await expect(api('/courses')).rejects.toMatchObject({ status: 401 })
    expect(clear).toHaveBeenCalledTimes(1)
  })
  it('ne relance aucune requête ni invalidation sur les refus d’authentification', async () => {
    const clear = vi.fn(); onUnauthorized(clear)
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(new Response('{"message":"Refus"}', { status: 401 })))
    vi.stubGlobal('fetch', fetcher)
    for (const path of ['/auth/me', '/auth/guest', '/auth/login', '/auth/register']) await expect(api(path)).rejects.toMatchObject({ status: 401 })
    expect(fetcher).toHaveBeenCalledTimes(4); expect(clear).not.toHaveBeenCalled()
  })
  it('distingue panne réseau et réponse illisible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(api('/decks', 'POST')).rejects.toMatchObject({ status: 0 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>')))
    await expect(api('/feed')).rejects.toThrow('illisible')
  })
  it('ignore une réponse tardive appartenant à un autre profil', async () => {
    let finish!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<Response>(resolve => { finish = resolve })))
    const clear = vi.fn(); onUnauthorized(clear)
    const request = api('/decks'); invalidateIdentityRequests()
    finish(new Response('{"message":"Ancienne session"}', { status: 401 }))
    await expect(request).rejects.toMatchObject({ status: 409 })
    expect(clear).not.toHaveBeenCalled()
  })
})
describe('Validation', () => {
  it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/\nevil', null, ['//evil.test']])('refuse les redirections non internes %s', value => { expect(safeRedirect(value)).toBe('/feed') })
  it('conserve une route interne avec sa query', () => { expect(safeRedirect('/decks/123?tab=cards')).toBe('/decks/123?tab=cards') })
  it('respecte la longueur et les octets UTF-8 du mot de passe', () => {
    expect(passwordError('a'.repeat(11))).not.toBe('')
    expect(passwordError('a'.repeat(12))).toBe('')
    expect(passwordError('é'.repeat(36))).toBe('')
    expect(passwordError('é'.repeat(37))).toContain('72 octets')
  })
})