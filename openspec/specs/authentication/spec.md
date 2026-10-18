## Purpose

Permettre l'accès sécurisé au compte et sa récupération, avec une identité commune aux usages apprenant et créateur. Source dédoublonnée : [spécification manuelle, section 4](../../../../spec-manuelle/spec.md).

## Requirements

### Requirement: Inscription et identité unique
Le système SHALL inscrire un utilisateur par email et mot de passe, créer automatiquement son profil et lui attribuer un identifiant unique, un username unique conforme à `^[a-z0-9_]{3,24}$`, un nom d'affichage et une date de création. Un compte SHALL permettre à la fois d'apprendre et de créer. L'email SHALL être normalisé en minuscules et unique ; les contraintes d'unicité SHALL être garanties en base.

#### Scenario: Inscription valide sans confirmation obligatoire
- **WHEN** une personne soumet des données valides et uniques avec la confirmation désactivée
- **THEN** son compte et son profil sont créés, une session est ouverte et l'interface conduit à `/feed`.

#### Scenario: Données invalides ou identité déjà utilisée
- **WHEN** le username ne respecte pas les caractères ou la longueur autorisés, ou que l'email ou le username existe déjà
- **THEN** l'inscription est refusée avec une erreur de validation ou de conflit exploitable près des champs, sans créer de compte en doublon.

### Requirement: Connexion et cycle de session
Le système SHALL permettre la connexion par email et mot de passe, la restauration de session au rechargement et la déconnexion. Les sessions SHALL être persistées côté serveur, expirer et utiliser un cookie httpOnly, SameSite=Lax et Secure en production ; leur identifiant SHALL être renouvelé à la connexion et à l'inscription authentifiée.

#### Scenario: Connexion puis restauration
- **WHEN** un utilisateur confirmé fournit ses identifiants valides puis recharge une page interne
- **THEN** une nouvelle session est créée et son identité est restaurée tant que la session reste valide, sans exposer de jeton de session au JavaScript.

#### Scenario: Refus et déconnexion
- **WHEN** les identifiants sont incorrects, la session expire ou l'utilisateur se déconnecte
- **THEN** les identifiants incorrects reçoivent un message générique, une session expirée n'authentifie plus les requêtes et la déconnexion détruit la session et efface le cookie.

### Requirement: Protection des identifiants et des actions
Le système SHALL stocker uniquement un hash bcrypt du mot de passe, accepter à l'inscription et au reset des mots de passe d'au moins 12 caractères et d'au plus 72 octets UTF-8, et ne jamais retourner hash, jetons stockés ou secrets de session. Les mutations SHALL déterminer l'acteur depuis la session, refuser une origine navigateur non autorisée et les corps non JSON, et limiter les tentatives d'authentification.

#### Scenario: Tentative d'usurpation ou origine hostile
- **WHEN** une requête tente d'imposer l'identité d'un autre utilisateur, provient d'une origine interdite ou dépasse la limite d'authentification
- **THEN** elle ne peut pas agir au nom de cet utilisateur et reçoit une erreur adaptée ; aucun secret n'est retourné.

#### Scenario: Mot de passe non conforme
- **WHEN** un mot de passe de création ou de reset est trop court ou dépasse 72 octets UTF-8
- **THEN** il est refusé avant enregistrement avec un message de validation, sans troncature silencieuse.

### Requirement: Récupération du compte
Le système SHALL proposer une demande de réinitialisation et un formulaire de nouveau mot de passe via un lien temporaire à usage unique, valable une heure. Un nouveau lien SHALL remplacer l'ancien ; un reset réussi SHALL invalider toutes les sessions précédentes et nécessiter une reconnexion. Seule l'empreinte du jeton SHALL être persistée.

#### Scenario: Réinitialisation réussie
- **WHEN** l'utilisateur suit un lien valide et choisit un mot de passe conforme
- **THEN** le nouveau mot de passe remplace l'ancien, le lien est consommé et toutes les sessions antérieures sont inutilisables.

#### Scenario: Lien invalide ou remplacé
- **WHEN** un lien est expiré, déjà utilisé ou remplacé par une nouvelle demande
- **THEN** le reset est refusé et l'utilisateur peut demander un nouveau lien sans modification du mot de passe.

### Requirement: Livraison des liens selon l'environnement
Le système SHALL utiliser SMTP lorsqu'il est configuré et exiger SMTP en production pour la récupération du compte. Hors production et sans SMTP uniquement, il SHALL permettre d'afficher les liens explicites de développement `devResetUrl` et, si nécessaire, `devVerificationUrl`. En production, la récupération SHALL retourner un message générique pour un compte connu, inconnu ou un échec de livraison, sans exposer de lien ni journaliser de secret.

#### Scenario: Développement sans SMTP
- **WHEN** une demande concerne un compte existant en développement sans SMTP
- **THEN** le lien de développement retourné peut être affiché dans l'interface dédiée ; cette exception d'énumération de compte est réservée au développement.

#### Scenario: Production et livraison SMTP
- **WHEN** l'application est configurée pour la production
- **THEN** le démarrage refuse l'absence de SMTP et aucun lien de développement n'est exposé, même en cas d'échec de livraison.

### Requirement: Confirmation d'email configurable
Le système SHALL permettre d'activer ou désactiver la confirmation de l'email par configuration. Lorsqu'elle est activée, une inscription SHALL nécessiter un lien à usage unique valable 24 heures avant toute connexion ; une livraison de confirmation échouée SHALL permettre de réessayer sans compte incomplet bloquant.

#### Scenario: Confirmation activée
- **WHEN** une personne s'inscrit avec la confirmation obligatoire
- **THEN** aucune session authentifiée n'est créée avant confirmation, le lien valide confirme l'adresse et une connexion explicite devient possible ; les liens expirés ou consommés sont refusés.

#### Scenario: Échec de livraison à l'inscription
- **WHEN** SMTP échoue pendant l'envoi de la confirmation obligatoire
- **THEN** l'inscription non confirmée est annulée et une erreur temporaire permet de réessayer.