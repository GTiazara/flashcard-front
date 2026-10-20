export type Recall = 'unknown' | 'doubt' | 'known'
export function newReview() { return { index: 0, flipped: false, visited: new Set<number>([0]), marks: {} as Record<number, Recall>, startedAt: Date.now() } }
export function moveReview(state: ReturnType<typeof newReview>, delta: number, length: number) {
  state.index = Math.max(0, Math.min(length - 1, state.index + delta)); state.flipped = false; state.visited.add(state.index)
}
export function reviewScore(counts: { known?: number; doubt?: number; unknown?: number }) {
  const known = counts.known ?? 0, doubt = counts.doubt ?? 0, unknown = counts.unknown ?? 0
  const rated = known + doubt + unknown
  return { known, doubt, unknown, rated, percent: rated ? Math.round((known + doubt * 0.5) / rated * 100) : null }
}
export function reviewPayload(state: ReturnType<typeof newReview>) {
  const score = reviewScore({
    known: Object.values(state.marks).filter(mark => mark === 'known').length,
    doubt: Object.values(state.marks).filter(mark => mark === 'doubt').length,
    unknown: Object.values(state.marks).filter(mark => mark === 'unknown').length,
  })
  return {
    cardsVisited: Math.min(100000, state.visited.size),
    durationSeconds: Math.max(1, Math.min(86400, Math.round((Date.now() - state.startedAt) / 1000))),
    knownCount: score.known, doubtCount: score.doubt, unknownCount: score.unknown,
  }
}