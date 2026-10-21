import type { Card, Deck, User } from '../types'

export interface StaticPublication extends Deck {
  _id: `static:${string}`
  slug: string
  course: string
  body: string
  sections: { definition?: string; example?: string; takeaway?: string; credits?: string }
  owner: User
}

const files = import.meta.glob('../content/static/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>

function parseFile(source: string, filename: string): StaticPublication | null {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/)
  if (!match) throw new Error(`Frontmatter Markdown invalide : ${filename}`)
  const meta: Record<string, string> = {}
  for (const line of (match[1] || '').split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*?)\s*$/)
    if (field) meta[field[1]!] = field[2]!.replace(/^(['"])(.*)\1$/, '$2')
  }
  if (meta.draft === 'true') return null
  for (const key of ['slug', 'author', 'authorName', 'course', 'title']) {
    if (!meta[key]) throw new Error(`Champ ${key} manquant dans ${filename}`)
  }
  const content = match[2] || ''
  const cardsHeading = content.search(/^## Cartes\s*$/im)
  const courseText = cardsHeading < 0 ? '' : content.slice(0, cardsHeading)
  const cardText = cardsHeading < 0 ? '' : content.slice(cardsHeading).replace(/^## Cartes\s*\r?\n/i, '')
  const cards: Card[] = []
  let side: 'front' | 'back' | null = null, front = '', back = ''
  const commitCard = () => {
    if (side !== null || front || back) {
      if (!front.trim() || !back.trim()) throw new Error(`Carte incomplète dans ${filename} : chaque Q: doit avoir une réponse A:`)
      cards.push({ _id: `${meta.slug}:${cards.length}`, front: front.trim(), back: back.trim(), position: cards.length })
    }
    side = null; front = ''; back = ''
  }
  for (const line of cardText.split(/\r?\n/)) {
    const question = line.match(/^Q:\s*(.*)$/)
    const answer = line.match(/^A:\s*(.*)$/)
    if (question) { commitCard(); side = 'front'; front = question[1]!; continue }
    if (answer) {
      if (side !== 'front') throw new Error(`A: sans question Q: dans ${filename}`)
      side = 'back'; back = answer[1]!; continue
    }
    if (side === 'front') front += `${front ? '\n' : ''}${line}`
    else if (side === 'back') back += `${back ? '\n' : ''}${line}`
  }
  commitCard()
  if (!cards.length) throw new Error(`Aucune carte Q:/A: dans ${filename}`)
  const sectionNames: Record<string, keyof StaticPublication['sections']> = { definition: 'definition', exemple: 'example', 'a retenir': 'takeaway', 'sources des images': 'credits' }
  const sections: StaticPublication['sections'] = {}
  const headings = [...courseText.matchAll(/^##\s+(.+?)\s*$/gm)]
  for (let index = 0; index < headings.length; index++) {
    const heading = headings[index]!
    const name = heading[1]!.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr')
    const key = sectionNames[name]
    if (key) {
      const start = heading.index! + heading[0].length
      const end = headings[index + 1]?.index ?? courseText.length
      const value = courseText.slice(start, end).trim()
      if (value) sections[key] = value
    }
  }
  const body = headings.length ? courseText.slice(0, headings[0]!.index).trim() : courseText.trim()
  const owner: User = { _id: `static-user:${meta.author}`, username: meta.author!, displayName: meta.authorName!, isGuest: false, bio: meta.authorBio || 'Cours et paquets publiés depuis des fichiers Markdown.' }
  return {
    _id: `static:${meta.slug}`, slug: meta.slug!, title: meta.title!, description: meta.description || '', subject: meta.subject || meta.course!, level: meta.level || '',
    visibility: 'public', owner, cardCount: cards.length, cards, course: meta.course!, body, sections,
  }
}

export const staticPublications = Object.entries(files).map(([path, source]) => parseFile(source, path)).filter((item): item is StaticPublication => item !== null)
export function getStaticPublication(slug: string) { return staticPublications.find(item => item.slug === slug) }
export function getStaticAuthor(username: string): User | undefined { return staticPublications.find(item => item.owner.username === username)?.owner }
