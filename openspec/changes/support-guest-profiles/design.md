# Context

Le frontend Vue utilise une identité réactive et des requêtes avec cookies ; le backend Express conserve les sessions dans MongoDB. User porte déjà le profil et toutes les références métier utilisent son `_id`. Les spécifications de référence [authentication](../../specs/authentication/spec.md), [profiles](../../specs/profiles/spec.md) et [experience](../../specs/experience/spec.md) décrivent surtout le compte permanent. Les deltas de ce changement explicitent l'invité, sans modifier les garanties de topologie du changement standalone.

# Goals / Non-Goals

**Objectifs :** accès immédiat authentifié, restauration sur ce navigateur, conversion conservant toutes les références, sécurité identique pour invités et comptes, documentation et preuves traçables.

**Non-objectifs :** identité hors serveur, fusion implicite, récupération email d'un invité, purge quotidienne, migration de production exécutée par l'agent, certification SMTP/TLS ou MongoDB utilisateur.

# Decisions

## Identité et initialisation

`initAuth()` mutualise son initialisation : GET `/api/auth/me` puis POST `/api/auth/guest` avec `{}` uniquement après 401 initial. Une panne réseau, 5xx ou 429 ne déclenche pas de création alternative ni de boucle. Les pages `/verify-email`, `/reset-password`, `/forgot-password` et l'état de vérification en attente ne créent pas automatiquement d'invité.

Un 401 métier ultérieur invalide l'identité et les vues sensibles, sans recréation automatique ; la reprise est explicite. Les requêtes tardives d'une ancienne identité sont ignorées et les vues/brouillons sont séparés par `_id`. Le booléen de confirmation en sessionStorage n'est pas une identité ni un secret. Les brouillons de contenu en localStorage n'authentifient jamais leur propriétaire.

## Cookie durable et session

POST guest retrouve d'abord une session valide (prioritaire), sinon un User invité via l'empreinte du cookie `mnemo.guest`, sinon crée un invité et un nouveau secret. Le token est généré par le serveur, aléatoire sur 256 bits, encodé en 64 caractères hexadécimaux. Un cookie inconnu, forgé, dupliqué ou mal encodé n'est jamais adopté. Le navigateur reçoit seulement un cookie HttpOnly, SameSite=Lax, Secure en production, Path=/, sans Domain, Max-Age demandé de 400 jours. Le hash SHA-256 unique sparse `guestTokenHash` est masqué des projections.

Une restauration régénère et sauvegarde une session `flashcard.sid` avec `userId` et `authVersion`. Le cookie durable n'est émis que lors de la création, pas renouvelé systématiquement. Une session permanente valide prime et n'est pas transformée en invité. JWT, userID fourni comme autorité et identité en localStorage sont exclus.

## Modèle et permissions

Même collection User : `isGuest` booléen (anciens comptes interprétés comme permanents), email/passwordHash requis uniquement pour un permanent, username unique conforme et nom d'affichage généré depuis des mots originaux. Aucun TTL User/contenu, aucun jour UTC de réinitialisation. Le TTL des sessions reste distinct du cookie durable.

L'invité authentifié peut gérer cours, chapitres, paquets et cartes, éditer son profil, publier, aimer, enregistrer et conserver ses révisions. Toutes les validations, protections d'origine/JSON, limites de débit et permissions propriétaire restent actives. Les projections exposent `isGuest`, jamais email, hashes, tokens ou version d'authentification.

## Conversion et confirmation

POST register convertit seulement l'invité de la session courante, jamais un ID soumis ni le seul cookie durable. La mise à jour conditionnelle compare `_id`, `isGuest`, `authVersion` et hash : même `_id`, propriétaires, bio/avatar et contenu conservés ; username/displayName remplacés par les valeurs inscrites, email normalisé et mot de passe bcrypt ajoutés. Incrément de version, suppression du hash invité et retrait du cookie révoquent l'ancien accès. Les conflits d'unicité ou doubles conversions sont refusés sans écraser un compte permanent.

Sans confirmation obligatoire, une session permanente renouvelée est ouverte. Avec confirmation, le lien à usage unique expire après 24 h ; après livraison réussie, la session invitée et les cookies sont retirés, aucune session permanente n'est ouverte avant confirmation puis login explicite. Le frontend garde seulement un booléen de confirmation en attente dans l'onglet.

En cas d'échec SMTP, une compensation conditionnelle restaure l'invité et son accès (même `_id`, hash, version, username/displayName) sans supprimer son contenu ; une inscription nouvelle non convertie est annulée. La compensation ne doit pas écraser une confirmation ou un reset concurrent. Ce mécanisme n'est **pas** une transaction DB/SMTP : un crash après écriture ou une panne DB pendant restauration peut laisser un compte non confirmé nécessitant une inspection opérateur. Ne pas promettre une restauration après tout crash.

## Connexion et sortie

Login sur un compte existant remplace la session et efface le cookie invité, sans fusion ni réattribution des contenus. L'interface prévient de cette absence de transfert ; la conversion par register est le chemin de conservation.

Logout détruit la session et retire les deux cookies, pour invités comme permanents, sans supprimer User/contenu. L'invité confirme le risque de perte définitive d'accès ; annuler conserve l'état. Une sortie échouée ne doit pas annoncer le succès. Après sortie réussie, une nouvelle entrée invitée exige une action explicite ou un rechargement, pas une recréation silencieuse immédiate.

# Migration Plan

1. Diagnostiquer d'abord l'accès DB : MongoDB est obligatoire. Le code 18 exige de corriger compte, mot de passe ou `authSource`, jamais de contourner l'authentification ou de passer à un stockage local.
2. Sauvegarder données et définitions d'index ; arrêter toutes les API et tous les autres producteurs d'écritures.
3. Inspecter les index `users` et doublons email string. Un ancien index email unique normal ou sparse est incompatible avec plusieurs invités sans email. Le démarrage le refuse, sans suppression automatique ni `syncIndexes`.
4. Exécuter explicitement `npm run migrate:email-index -- --maintenance-confirmed` selon le [guide backend](../../../../flashcard-back/README.md#migration-sûre-de-lancien-index-email-maintenance-explicite) et le [script opérateur](../../../../flashcard-back/scripts/migrate-email-index.ts). L'URI et éventuellement la base sont fournis par environnement sécurisé ; le script ne lit pas dotenv et ne modifie aucun document.
5. Vérifier `email_string_unique` : unique, filtre partiel `{email: {$type: 'string'}}`, et conservation des autres index, avant redémarrage. L'opération est idempotente ; doublons et définitions inconnues imposent un arrêt pour diagnostic.
6. La suppression/création d'index n'est pas atomique. En cas d'échec, le script tente de restaurer l'ancien index ; si cela échoue, conserver l'API arrêtée et restaurer depuis la sauvegarde. Ne pas réintroduire aveuglément l'ancien index après création de plusieurs invités sans email.

**Aucune migration ni vérification de la base utilisateur n'a été réalisée pour cette documentation.**

# Risks / Trade-offs

- 400 jours expriment une durée demandée, pas une garantie : navigateur, suppression des cookies, changement d'appareil ou logout peuvent supprimer l'accès. Pas de récupération email avant conversion et pas de suppression automatique des données devenues inaccessibles.
- Cookie durable = secret bearer sensible, jamais journalisé ; une copie volée reste sensible jusqu'à révocation du hash par conversion.
- Compensation SMTP limitée face aux crashs et pannes DB ; pas d'atomicité distribuée ni de réparation automatique revendiquée.
- MongoDB standalone garde ses limites mono-processus et écritures partielles ; aucun changement invité ne les supprime.
- Tests isolés ne certifient pas la DB utilisateur, la maintenance de production, SMTP/TLS réel, la conservation pendant 400 jours ni l'accessibilité exhaustive.

# Verification

Voir [verification.md](verification.md) pour les résultats déjà exécutés par les sous-agents, leur périmètre et les réserves. Cette passe documentaire exécute uniquement la validation OpenSpec stricte, pas les builds ni les tests applicatifs.