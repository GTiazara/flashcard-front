## Why

Transformer la [spécification manuelle](../../../../spec-manuelle/spec.md) en critères vérifiables et dédoublonnés pour créer, apprendre et partager des flashcards. Le frontend et le backend sont désormais implémentés et validés localement ; cette finalisation du 18 octobre 2026 documente la réalisation et ses preuves, sans assimiler ces résultats à une certification de production. Les réserves restent suivies dans [tasks.md](tasks.md) et [verification.md](verification.md).

## What Changes

- Définir sept capacités et leurs scénarios d'acceptation, en français avec structure OpenSpec en anglais.
- Livrer une interface Vue 3, Vite, TypeScript et Tailwind CSS pour l'authentification, la bibliothèque, l'édition, les révisions, le fil social et les profils.
- S'appuyer sur l'API Express TypeScript, les modèles Mongoose et MongoDB en replica set ou Atlas, avec transactions pour les invariants métier.
- Conserver les sessions MongoDB via connect-mongo, les cookies httpOnly et bcrypt ; SMTP facultatif en développement avec liens explicites, obligatoire en production pour la récupération du compte ; confirmation d'email configurable.
- Fixer les règles : username `^[a-z0-9_]{3,24}$`, contenus privés par défaut, liens non listés fondés sur l'ID comme capacité de lecture, classement populaire par total de J'aime puis date.
- Exiger la connexion pour bibliothèque, création/édition et révision ; proposer l'aperçu public facultatif sur `/feed`, `/profile/:username` et `/decks/:id`, sans contourner les permissions API ni ouvrir les mutations anonymes. Les retours après connexion sont limités aux chemins internes sûrs.
- Compter dans le résumé d'étude les cartes uniques parcourues, sans compter deux fois les retours ; conserver le contrat API de visites plus permissif sans en faire une mesure de maîtrise.
- Centraliser la limite de faces via `CARD_TEXT_MAX_LENGTH` (entier 1–10000, défaut 10000) et `GET /api/config`, avec validation serveur toujours autoritaire.
- Exclure les abonnements, leurs listes et compteurs fonctionnels, les commentaires, la répétition espacée, la duplication de paquets, les médias enrichis et les recommandations complexes. Les filtres matière/niveau et l'accueil public restent optionnels, sans critère MVP obligatoire.

## Capabilities

### New Capabilities

- `authentication` : inscription, connexion, déconnexion, récupération, confirmation optionnelle et sécurité des sessions.
- `library` : cours, chapitres, paquets, hiérarchie, propriété, visibilité et suppressions en cascade.
- `flashcards` : édition manuelle de cartes textuelles, validation, ordre et protection des saisies.
- `study` : cartes recto-verso, navigation, progression, résumé et historique personnel sans mesure de maîtrise.
- `community` : publication, découverte paginée, recherche, tris, J'aime et enregistrements par référence.
- `profiles` : profil public sans email, modification propriétaire et confidentialité.
- `experience` : navigation publique/protégée, responsive, composants accessibles, états d'interface et exploitation cloud.

### Modified Capabilities

Aucune capacité antérieure lors de la création initiale : les sept références ont été créées simultanément. Leurs blocs d'exigences et les deltas `ADDED` sont maintenus cohérents, y compris les précisions de livraison ; cette synchronisation documentaire ne constitue pas à elle seule une preuve de chaque scénario.

## Impact

Cette finalisation modifie uniquement les artefacts sous OpenSpec, sans code, dépendance npm, environnement ou secret. Les builds et résultats de tests applicatifs déjà exécutés sont rapprochés des README et scénarios présents ; seule la validation stricte OpenSpec est exécutée ici. Aucun archivage automatique tant que les réserves demeurent. L'authentification de geopinpoint inspire uniquement l'ergonomie des cookies : aucun secret, cookie, stockage de session ou domaine d'authentification n'est partagé.