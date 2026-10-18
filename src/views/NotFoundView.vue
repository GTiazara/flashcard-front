<script setup lang="ts">
import EmptyState from '../components/EmptyState.vue'
</script>
<template><div class="narrow"><EmptyState title="Cette idée s’est égarée." description="Cette page n’existe pas ou son adresse a changé. Revenons à nos découvertes."><RouterLink to="/feed" class="btn btn-primary">Retour à l’exploration</RouterLink></EmptyState></div></template>