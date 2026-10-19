export interface User { _id: string; username: string; displayName: string; isGuest: boolean; bio?: string; avatarUrl?: string }
export interface Page<T> { items: T[]; page: number; hasMore: boolean }
export type Visibility = 'private' | 'unlisted' | 'public'
export interface Card { _id: string; front: string; back: string; frontImageUrl?: string; backImageUrl?: string; position: number }
export interface Deck {
  _id: string; title: string; description: string; subject?: string; level?: string;
  visibility: Visibility; chapter?: string | null; owner: User | string;
  cardCount: number; cards?: Card[]; preview?: { front: string; back: string; frontImageUrl?: string; backImageUrl?: string }; createdAt?: string; coverUrl?: string;
}
export interface Course { _id: string; title: string; description?: string; color?: string; icon?: string; createdAt?: string }
export interface Chapter { _id: string; title: string; description?: string; position: number; course: string }
export interface Publication { _id: string; deck: Deck; owner: User; createdAt: string; likeCount: number; liked: boolean; saved: boolean }
export interface Profile extends User { publicDeckCount: number; followerCount: number; followingCount: number; decks: Deck[]; page: number; hasMore: boolean }
export interface StudySession { _id: string; deck: string; cardsVisited: number; durationSeconds: number; createdAt: string }
export interface Message { message: string; devResetUrl?: string; devVerificationUrl?: string }
export interface Verification extends Message { requiresVerification: true }
export const ownerId = (deck: Deck) => typeof deck.owner === 'string' ? deck.owner : deck.owner._id