export interface FieldError { path: string; message: string }
export class ApiError extends Error {
  constructor(message: string, public status = 0, public errors: FieldError[] = []) { super(message); this.name = 'ApiError' }
}
let unauthorized: () => void = () => undefined
export function onUnauthorized(callback: () => void) { unauthorized = callback }
let identityVersion = 0
export function invalidateIdentityRequests() { identityVersion++ }
const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const version = identityVersion
  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      method, credentials: 'include',
      headers: method === 'GET' ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      ...(method !== 'GET' ? { body: JSON.stringify(body ?? {}) } : {}),
    })
  } catch { throw new ApiError('Connexion impossible. Vérifiez votre réseau et réessayez. Le résultat d’une modification peut être incertain.') }
  if (version !== identityVersion) throw new ApiError('Le profil actif a changé. Cette réponse a été ignorée.', 409)
  if (response.status === 401 && !['/auth/me', '/auth/guest', '/auth/login', '/auth/register'].includes(path)) unauthorized()
  if (response.status === 204) return undefined as T
  let data: unknown
  try { data = await response.json() } catch { throw new ApiError('Réponse du serveur illisible. Réessayez plus tard.', response.status) }
  if (version !== identityVersion && response.status !== 401) throw new ApiError('Le profil actif a changé. Cette réponse a été ignorée.', 409)
  if (!response.ok) {
    const failure = data as { message?: string; errors?: FieldError[] }
    throw new ApiError(failure.message || 'Une erreur est survenue.', response.status, failure.errors || [])
  }
  return data as T
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Une erreur est survenue.' }
export function fieldErrors(error: unknown): Record<string, string> {
  return error instanceof ApiError ? Object.fromEntries(error.errors.map(item => [item.path.replace(/^body\./, ''), item.message])) : {}
}
export function safeRedirect(value: unknown, fallback = '/feed'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return fallback
  try { const url = new URL(value, 'https://mnemo.invalid'); return url.origin === 'https://mnemo.invalid' ? `${url.pathname}${url.search}${url.hash}` : fallback } catch { return fallback }
}
export function passwordError(password: string): string {
  if (password.length < 12) return 'Utilisez au moins 12 caractères.'
  if (new TextEncoder().encode(password).length > 72) return 'Le mot de passe ne doit pas dépasser 72 octets UTF-8.'
  return ''
}