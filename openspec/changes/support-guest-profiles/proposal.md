# Why

Permettre de créer, réviser et partager sans imposer une inscription préalable, tout en conservant une véritable identité serveur. Le profil temporaire doit pouvoir devenir un compte permanent sans perdre ses contenus. Ce changement formalise les implémentations et validations déjà rapportées par les sous-agents, sans réexécuter leurs suites.

# What Changes

- Initialiser une fois l'identité par `GET /api/auth/me`, puis seulement sur 401 créer ou restaurer un invité via `POST /api/auth/guest`, hors confirmation en attente et pages sensibles.
- Utiliser le même document User avec `isGuest: true`, email et hash de mot de passe facultatifs pour l'invité, username et nom d'affichage générés. Aucune purge quotidienne ni TTL des utilisateurs/contenus.
- Restaurer l'invité avec un secret opaque généré par le serveur : cookie HttpOnly, SameSite=Lax, Secure en production, durée demandée de 400 jours, seule empreinte SHA-256 en DB. Aucun JWT ni stockage local d'identité.
- Ouvrir CRUD, révision et social avec les permissions existantes ; convertir par inscription au même `_id`, sans changer les propriétaires. Confirmation d'email configurable et restauration conditionnelle après échec SMTP.
- Distinguer conversion et connexion à un compte existant : aucune fusion. Avertir avant connexion/sortie ; logout retire les cookies mais ne supprime pas les données.
- Remplacer l'ancien index email unique par un index unique partiel via une maintenance explicite, jamais au démarrage.

# Capabilities

## Modified Capabilities

- `authentication` : invité authentifié, restauration, conversion, sécurité et migration email.
- `profiles` : identité temporaire générée et conservation du profil à la conversion.
- `experience` : accès temporaire, navigation, erreurs et avertissements de perte d'accès.

# Impact

Contrats frontend/backend existants et documentation racine. Les sources de référence sont [auth frontend](../../../src/lib/auth.ts), [auth backend](../../../../flashcard-back/src/auth.ts), [modèles](../../../../flashcard-back/src/models.ts) et les README des [frontend](../../../README.md) et [backend](../../../../flashcard-back/README.md). MongoDB reste obligatoire ; l'invité ne contourne pas une erreur MongoDB d'authentification code 18.

Hors périmètre : fusion de comptes, transfert inter-appareils, JWT, identité en localStorage, purge quotidienne, migration automatique, modification d'environnement ou de base utilisateur. Les 400 jours ne garantissent pas la conservation du cookie ; DB et SMTP ne forment pas une transaction distribuée.