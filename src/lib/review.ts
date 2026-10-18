export function newReview() { return { index: 0, flipped: false, visited: new Set<number>([0]), startedAt: Date.now() } }
export function moveReview(state: ReturnType<typeof newReview>, delta: number, length: number) {
  state.index = Math.max(0, Math.min(length - 1, state.index + delta)); state.flipped = false; state.visited.add(state.index)
}
export function reviewPayload(state: ReturnType<typeof newReview>) {
  return { cardsVisited: Math.min(100000, state.visited.size), durationSeconds: Math.max(1, Math.min(86400, Math.round((Date.now() - state.startedAt) / 1000))) }
}