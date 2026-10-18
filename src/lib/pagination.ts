import { ref } from 'vue'
import { api, errorMessage } from './api'
import type { Page } from '../types'

export function usePagination<T>(url: () => string) {
  const items = ref<T[]>([]) as import('vue').Ref<T[]>
  const busy = ref(false), error = ref(''), hasMore = ref(false), page = ref(0)
  let version = 0
  async function load(reset = false) {
    if (busy.value && !reset) return
    if (reset) { version++; items.value = []; page.value = 0; hasMore.value = false }
    const current = version, next = page.value + 1
    busy.value = true; error.value = ''
    try {
      const path = url()
      const result = await api<Page<T>>(`${path}${path.includes('?') ? '&' : '?'}page=${next}&limit=12`)
      if (current !== version) return
      items.value = reset ? result.items : [...items.value, ...result.items]; page.value = result.page; hasMore.value = result.hasMore
    } catch (err) { if (current === version) error.value = errorMessage(err) }
    finally { if (current === version) busy.value = false }
  }
  return { items, busy, error, hasMore, load }
}
export async function allPages<T>(path: string): Promise<T[]> {
  const items: T[] = []
  for (let page = 1; ; page++) {
    const result = await api<Page<T>>(`${path}${path.includes('?') ? '&' : '?'}page=${page}&limit=100`)
    items.push(...result.items)
    if (!result.hasMore) return items
  }
}