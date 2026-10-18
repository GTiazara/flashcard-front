import { describe, expect, it, vi } from 'vitest'
import { moveReview, newReview, reviewPayload } from '../../src/lib/review'
describe('Parcours de révision', () => {
  it('revient au recto et respecte les bornes', () => {
    const state = newReview(); state.flipped = true
    moveReview(state, 1, 2); expect(state.index).toBe(1); expect(state.flipped).toBe(false)
    moveReview(state, 1, 2); expect(state.index).toBe(1)
    moveReview(state, -1, 2); moveReview(state, -1, 2); expect(state.index).toBe(0)
  })
  it('compte les cartes uniques sans prétendre mesurer leur maîtrise', () => {
    const state = newReview()
    moveReview(state, 1, 3); moveReview(state, -1, 3); moveReview(state, 1, 3)
    expect(reviewPayload(state).cardsVisited).toBe(2)
  })
  it('borne la durée et utilise le temps approximatif', () => {
    const time = vi.spyOn(Date, 'now').mockReturnValue(1000)
    const state = newReview(); expect(reviewPayload(state).durationSeconds).toBe(1)
    time.mockReturnValue(101000); expect(reviewPayload(state).durationSeconds).toBe(100)
    time.mockReturnValue(999999999); expect(reviewPayload(state).durationSeconds).toBe(86400)
    time.mockRestore()
  })
})