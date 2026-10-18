## MODIFIED Requirements

### Requirement: Inscription et identité unique
Le système SHALL inscrire un utilisateur par email et mot de passe, créer automatiquement son profil et lui attribuer un identifiant unique, un username unique conforme à `^[a-z0-9_]{3,24}$`, un nom d'affichage et une date de création. Un compte SHALL permettre à la fois d'apprendre et de créer. L'email SHALL être normalisé en minuscules et unique lorsqu'il existe ; les contraintes d'unicité SHALL être garanties en base. L'inscription depuis une session invitée SHALL convertir ce même User, conserver son `_id`, ses propriétaires et contenus, sa biographie et son avatar, puis appliquer le username et le nom soumis. Elle SHALL refuser les doubles conversions et l'inscription depuis un compte permanent connecté, sans écrasement ; ni un ID client ni le seul cookie durable ne SHALL autoriser une conversion.

#### Scenario: Inscription valide sans confirmation obligatoire
- **WHEN** une personne soumet des données valides et uniques avec la confirmation désactivée
- **THEN** son compte et son profil sont créés, ou son profil invité courant est converti au même `_id`, une session renouvelée est ouverte et l'interface conduit à `/feed` ; la conversion conserve toutes les propriétés et révoque l'ancien accès invité.

#### Scenario: Données invalides ou identité déjà utilisée
- **WHEN** le username ne respecte pas les caractères ou la longueur autorisés, ou que l'email ou le username existe déjà
- **THEN** l'inscription est refusée avec une erreur de validation ou de conflit exploitable près des champs, sans créer de compte en doublon ni perdre le contenu invité.

#### Scenario: Conversion concurrente ou acteur permanent
- **WHEN** deux conversions visent le même invité ou qu'un compte permanent connecté tente une inscription
- **THEN** la condition atomique sur l'identité invitée empêche l'écrasement ou la double conversion et l'opération incompatible reçoit un conflit.

### Requirement: Connexion et cycle de session
Le système SHALL permettre la connexion par email et mot de passe, la restauration de session au rechargement et la déconnexion. Les sessions SHALL être persistées côté serveur, expirer et utiliser un cookie httpOnly, SameSite=Lax et Secure en production ; leur identifiant SHALL être renouvelé à la connexion et à l'inscription authentifiée. Une session invitée SHALL authentifier le même User que ses contenus. La connexion à un compte existant SHALL remplacer la session et retirer le cookie invité sans fusion ni transfert. La déconnexion SHALL détruire la session et retirer les cookies de session et d'invité, sans supprimer User ni contenu.

#### Scenario: Connexion puis restauration
- **WHEN** un utilisateur confirmé fournit ses identifiants valides puis recharge une page interne
- **THEN** une nouvelle session est créée et son identité est restaurée tant que la session reste valide, sans exposer de jeton de session au JavaScript.

#### Scenario: Refus et déconnexion
- **WHEN** les identifiants sont incorrects, la session expire ou l'utilisateur se déconnecte
- **THEN** les identifiants incorrects reçoivent un message générique, une session expirée n'authentifie plus les requêtes et la déconnexion détruit la session et efface les deux cookies, sans supprimer les données.

#### Scenario: Connexion depuis un invité vers un compte existant
- **WHEN** un invité se connecte avec les identifiants valides d'un compte existant
- **THEN** la session devient celle de ce compte, le cookie invité est retiré et les contenus de l'invité ne sont ni transférés ni fusionnés.

### Requirement: Confirmation d'email configurable
Le système SHALL permettre d'activer ou désactiver la confirmation de l'email par configuration. Lorsqu'elle est activée, une inscription SHALL nécessiter un lien à usage unique valable 24 heures avant toute connexion permanente ; une livraison de confirmation échouée SHALL permettre de réessayer sans compte incomplet bloquant. Après livraison réussie pour une conversion, la session et le cookie invités SHALL être retirés. Une panne SMTP contrôlée SHALL tenter une restauration conditionnelle de l'identité invitée au même `_id`, avec son hash, sa version et ses noms antérieurs, sans supprimer ses contenus et sans écraser une confirmation ou un reset concurrent. Le système SHALL documenter qu'un crash ou une panne DB pendant compensation peut nécessiter une intervention opérateur, sans garantie de transaction distribuée.

#### Scenario: Confirmation activée
- **WHEN** une personne s'inscrit avec la confirmation obligatoire
- **THEN** aucune session authentifiée permanente n'est créée avant confirmation, le lien valide confirme l'adresse et une connexion explicite devient possible ; les liens expirés ou consommés sont refusés et les contenus d'un invité converti restent conservés.

#### Scenario: Échec de livraison à l'inscription
- **WHEN** SMTP échoue pendant l'envoi de la confirmation obligatoire
- **THEN** l'inscription nouvelle non confirmée est annulée ou, en cas de conversion, l'identité invitée est restaurée conditionnellement sans perte de contenu ; une erreur temporaire permet de réessayer lorsque la compensation a réussi.

#### Scenario: Arrêt brutal ou échec de compensation
- **WHEN** le processus s'arrête après la conversion ou que la DB empêche la compensation SMTP
- **THEN** une restauration complète n'est pas garantie et l'état exige une inspection opérateur, sans suppression automatique du contenu ni promesse d'atomicité DB/SMTP.

## ADDED Requirements

### Requirement: Identité invitée serveur durable
Le système SHALL créer ou restaurer un User invité via POST `/api/auth/guest`, avec session valide prioritaire. L'accès durable SHALL utiliser un secret serveur opaque de 256 bits, cookie HttpOnly, SameSite=Lax, Secure en production, durée demandée 400 jours, et seule empreinte SHA-256 unique en DB. Il SHALL interdire JWT, identité en localStorage et identité choisie par le client. Cette durée ne SHALL pas garantir la conservation du cookie.

#### Scenario: Premier invité et reprise de session
- **WHEN** aucun utilisateur n'est authentifié et aucun cookie invité valide n'existe, puis que seule la session expire ultérieurement
- **THEN** le serveur accepte un corps JSON strict `{}`, crée un User `isGuest: true` avec email/passwordHash facultatifs, username unique et nom générés, et retourne directement sa projection incluant `isGuest` ; le cookie `mnemo.guest` a Path=/ et aucun Domain. Avec ce cookie encore valide il retrouve ensuite uniquement le même User encore invité et régénère une session sans créer un second profil ni renouveler systématiquement le cookie durable.

#### Scenario: Cookie invalide ou session prioritaire
- **WHEN** le cookie est inconnu, forgé, dupliqué ou mal encodé, ou qu'une session valide existe déjà
- **THEN** aucun secret fourni invalide n'est adopté ; sans session un nouveau secret est généré, tandis qu'une session valide garde son utilisateur, y compris permanent.

### Requirement: Permissions et persistance des invités
Le système SHALL autoriser CRUD personnel, révisions et social aux invités avec les mêmes contrôles que les comptes permanents. Il SHALL ne prévoir ni purge quotidienne ni TTL User/contenus. Login, récupération, reset et confirmation par email SHALL exclure les utilisateurs encore invités. Les projections SHALL ne révéler aucun email, hash, jeton ou secret de session.

#### Scenario: Création et interaction sans inscription
- **WHEN** un invité authentifié crée cours, chapitres, paquets et cartes, révise, publie, aime ou enregistre un paquet autorisé
- **THEN** les actions sont persistées avec son User comme acteur, sans inscription préalable ni remise à zéro au changement de jour ; contrôles propriétaire, visibilité, origine, JSON et limite d'authentification restent appliqués.

#### Scenario: Isolation et récupération impossible par email
- **WHEN** un invité tente une écriture étrangère ou une récupération email avant conversion
- **THEN** il ne reçoit aucun droit supplémentaire et aucun mécanisme email n'authentifie ce profil sans email ; les projections ne révèlent aucun secret.

### Requirement: Migration email explicite et base obligatoire
Le système SHALL garantir un email string unique par index partiel et refuser au démarrage l'ancien index unique non partiel sans suppression automatique. La migration SHALL exiger sauvegarde, arrêt des écritures et confirmation opérateur ; elle SHALL préserver documents et autres index, refuser doublons string et index inconnus. MongoDB authentifié SHALL rester obligatoire, sans repli ni contournement du code 18.

#### Scenario: Ancien index incompatible
- **WHEN** une base contient encore un index email unique non partiel
- **THEN** le démarrage demande une maintenance explicite pour l'index normal ou sparse, sans dropIndex automatique, suppression de données ou migration implicite.

#### Scenario: Migration en maintenance
- **WHEN** l'opérateur sauvegarde, arrête les écritures et lance le script avec confirmation et environnement sécurisé sur des index connus sans doublons string
- **THEN** tous les producteurs d'écritures restent arrêtés et seul l'index email historique est remplacé par l'index unique partiel permettant plusieurs invités sans email ; un nouveau passage est idempotent, les documents sont inchangés et les index doivent être contrôlés avant redémarrage.

#### Scenario: Échec de migration ou refus MongoDB
- **WHEN** la création d'index échoue ou que MongoDB refuse l'authentification code 18
- **THEN** la migration tente de restaurer l'ancien index et impose de garder l'API arrêtée si la restauration échoue ; un code 18 reste une erreur de configuration/droits à résoudre, sans création invitée hors DB.