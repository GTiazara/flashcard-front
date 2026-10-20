import { reactive } from 'vue'
import { api, ApiError, errorMessage, invalidateIdentityRequests, onUnauthorized } from './api'
import type { User } from '../types'

const pendingKey = 'mnemo:verification-pending'
export function verificationPending() { try { return sessionStorage.getItem(pendingKey) === 'true' } catch { return false } }
function pending(value: boolean) { try { if (value) sessionStorage.setItem(pendingKey, 'true'); else sessionStorage.removeItem(pendingKey) } catch { /* No credentials stored. */ } }
export const auth = reactive<{ user: User | null; ready: boolean; generation: number; error: string; stopped: boolean }>({ user: null, ready: false, generation: 0, error: '', stopped: false })
export function clearAuth() {
  invalidateIdentityRequests()
  auth.user = null; auth.generation++
  window.dispatchEvent(new Event('mnemo:unauthorized'))
}
onUnauthorized(() => {
  clearAuth(); auth.stopped = true
  auth.error = 'Votre session a expiré. Réessayez explicitement pour ouvrir un profil temporaire. Les données du profil précédent ne seront pas transférées.'
})
export function acceptUser(user: User) {
  if (auth.user?._id !== user._id) { invalidateIdentityRequests(); auth.generation++ }
  auth.user = { ...user, isGuest: user.isGuest === true }
  auth.error = ''; auth.stopped = false; pending(false)
}
export function requireVerification() {
  pending(true); clearAuth(); auth.error = ''; auth.stopped = true
}
let guestRequest: Promise<void> | undefined
export function ensureGuest(): Promise<void> {
  if (auth.user) return Promise.resolve()
  if (verificationPending()) return Promise.reject(new Error('Confirmez votre adresse puis connectez-vous pour retrouver votre profil.'))
  guestRequest ??= api<User>('/auth/guest', 'POST', {}).then(acceptUser).catch(error => {
    auth.error = errorMessage(error); throw error
  }).finally(() => { guestRequest = undefined; auth.ready = true })
  return guestRequest
}
let initialization: Promise<void> | undefined
export function initAuth(): Promise<void> {
  initialization ??= (async () => {
    try {
      const user = await api<User>('/auth/me')
      if (!verificationPending() || !user.isGuest) acceptUser(user)
    }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const sensitive = ['/verify-email', '/reset-password', '/recover', '/forgot-password'].includes(window.location.pathname)
        if (!sensitive && !verificationPending()) await ensureGuest()
      } else throw error
    }
  })().catch(error => { auth.error = errorMessage(error) }).finally(() => { auth.ready = true })
  return initialization
}
export async function retryAuth() {
  auth.error = ''
  try { await ensureGuest() } catch (error) { auth.error = errorMessage(error) }
}
export async function logout(): Promise<boolean> {
  if (auth.user?.isGuest && !window.confirm('Quitter ce profil temporaire ? Sans compte associé, vous risquez de perdre définitivement l’accès à son contenu.')) return false
  await api('/auth/logout', 'POST', {})
  clearAuth(); pending(false); auth.error = ''; auth.stopped = true
  return true
}