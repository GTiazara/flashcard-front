import { reactive, readonly } from 'vue'
import { api } from './api'

export const DEFAULT_CARD_TEXT_MAX_LENGTH = 10000
export interface PublicConfig { cardTextMaxLength: number }
const config = reactive<PublicConfig>({ cardTextMaxLength: DEFAULT_CARD_TEXT_MAX_LENGTH })
export const publicConfig = readonly(config)

export async function loadPublicConfig(): Promise<void> {
  let limit = DEFAULT_CARD_TEXT_MAX_LENGTH
  try {
    const data = await api<unknown>('/config')
    if (typeof data === 'object' && data !== null && 'cardTextMaxLength' in data) {
      const value = data.cardTextMaxLength
      if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= DEFAULT_CARD_TEXT_MAX_LENGTH) limit = value
    }
  } catch { /* Repli ergonomique uniquement : le serveur reste l’autorité de validation. */ }
  config.cardTextMaxLength = limit
}

export function cardTextError(front: string, back: string): string {
  const faces = [front.trim(), back.trim()]
  if (faces.some(face => !face)) return 'La question et la réponse sont obligatoires.'
  if (faces.some(face => face.length > publicConfig.cardTextMaxLength)) return `Chaque face est limitée à ${publicConfig.cardTextMaxLength} caractères.`
  return ''
}