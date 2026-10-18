import { afterEach, describe, expect, it, vi } from 'vitest'
import { cardTextError, DEFAULT_CARD_TEXT_MAX_LENGTH, loadPublicConfig, publicConfig } from '../../src/lib/config'

function respond(body: unknown, status = 200) {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}
afterEach(async () => {
  respond({ cardTextMaxLength: DEFAULT_CARD_TEXT_MAX_LENGTH })
  await loadPublicConfig()
  vi.unstubAllGlobals()
})

describe('Configuration publique et validation des faces', () => {
  it('conserve le défaut compatible sans chargement', () => {
    expect(publicConfig.cardTextMaxLength).toBe(10000)
    expect(cardTextError('x'.repeat(10000), 'R')).toBe('')
    expect(cardTextError('Q', 'x'.repeat(10001))).toContain('10000')
  })
  it('charge uniquement la limite publique depuis l’API et valide les deux faces après trim', async () => {
    const fetcher = respond({ cardTextMaxLength: 5, ignored: 'not copied' })
    await loadPublicConfig()
    expect(fetcher).toHaveBeenCalledWith('/api/config', expect.objectContaining({ method: 'GET', credentials: 'include' }))
    expect(publicConfig).toEqual({ cardTextMaxLength: 5 })
    expect(cardTextError(' 12345 ', 'abcde')).toBe('')
    expect(cardTextError('123456', 'R')).toContain('5 caractères')
    expect(cardTextError('Q', '123456')).toContain('5 caractères')
    expect(cardTextError('  ', 'R')).toContain('obligatoires')
    expect(cardTextError('Q', '\n')).toContain('obligatoires')
  })
  it('accepte les bornes et compte comme maxlength en UTF-16', async () => {
    respond({ cardTextMaxLength: 1 }); await loadPublicConfig()
    expect(cardTextError('Q', 'R')).toBe('')
    expect(cardTextError('😀', 'R')).toContain('1 caractères')
    respond({ cardTextMaxLength: 10000 }); await loadPublicConfig()
    expect(cardTextError('😀'.repeat(5000), 'R')).toBe('')
  })
  it.each([null, {}, { cardTextMaxLength: '5' }, { cardTextMaxLength: 0 }, { cardTextMaxLength: 10001 }, { cardTextMaxLength: 1.5 }])('revient au défaut si la réponse est invalide : %j', async body => {
    respond({ cardTextMaxLength: 5 }); await loadPublicConfig()
    respond(body); await loadPublicConfig()
    expect(publicConfig.cardTextMaxLength).toBe(10000)
  })
  it('ne bloque pas le démarrage en cas de panne réseau, HTTP ou JSON', async () => {
    for (const response of [() => Promise.reject(new TypeError('offline')), () => Promise.resolve(new Response('{}', { status: 503 })), () => Promise.resolve(new Response('<html>'))]) {
      respond({ cardTextMaxLength: 5 }); await loadPublicConfig()
      vi.stubGlobal('fetch', vi.fn(response))
      await expect(loadPublicConfig()).resolves.toBeUndefined()
      expect(publicConfig.cardTextMaxLength).toBe(10000)
    }
  })
})