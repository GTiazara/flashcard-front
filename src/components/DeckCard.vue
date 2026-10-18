<script setup lang="ts">
import { Layers3, ArrowUpRight, LockKeyhole, Globe2, Link2 } from 'lucide-vue-next'
import type { Deck } from '../types'
defineProps<{ deck: Deck }>()
const visibility = { private: 'Privé', unlisted: 'Non listé', public: 'Public' }
</script>
<template><article class="deck-tile surface"><div class="deck-tile-top"><span class="tile-icon"><Layers3 /></span><span class="subtle visibility"><component :is="deck.visibility === 'public' ? Globe2 : deck.visibility === 'unlisted' ? Link2 : LockKeyhole" :size="13" />{{ visibility[deck.visibility] }}</span></div><div class="badges"><span v-if="deck.subject" class="badge">{{ deck.subject }}</span><span v-if="deck.level" class="badge neutral">{{ deck.level }}</span></div><h3><RouterLink :to="`/decks/${deck._id}`">{{ deck.title }}</RouterLink></h3><p class="clamp">{{ deck.description || 'Un nouveau terrain de connaissances à explorer.' }}</p><footer><span><Layers3 :size="15" /> {{ deck.cardCount }} carte{{ deck.cardCount > 1 ? 's' : '' }}</span><RouterLink :to="`/decks/${deck._id}`" class="icon-link" :aria-label="`Ouvrir ${deck.title}`"><ArrowUpRight :size="20" /></RouterLink></footer><slot /></article></template>