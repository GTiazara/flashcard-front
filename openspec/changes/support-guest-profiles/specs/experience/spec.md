## MODIFIED Requirements

### Requirement: Navigation principale publique et protégée
L'application SHALL proposer aux utilisateurs connectés, y compris invités authentifiés, depuis les pages principales « Accueil » (`/feed`), « Bibliothèque » (`/library`), « Créer » (`/create`), « Réviser » (`/study`) et « Profil » (`/profile/:username`), avec un état actif visible. L'état temporaire et l'action de conservation SHALL rester identifiables sur ordinateur et mobile.

#### Scenario: Entrée et navigation après connexion
- **WHEN** un utilisateur termine sa connexion puis change de section
- **THEN** il arrive sur `/feed`, conserve une navigation accessible et voit la section active mise à jour ; un invité authentifié dispose des mêmes sections.

### Requirement: Accès privé et lecture publique autorisée
Les routes `/library`, `/create`, `/decks/:id/edit`, `/study` et `/study/:id` SHALL attendre l'initialisation de l'identité et une session, invitée ou permanente, avant rendu des données privées. `/feed`, `/profile/:username`, `/decks/:id` et les pages d'authentification, récupération et confirmation SHALL être ouverts sans session. Cette lecture ouverte SHALL respecter les permissions API ; toute écriture et révision persistée SHALL rester authentifiée, un invité étant un acteur authentifié. L'initialisation mutualisée SHALL appeler GET `/api/auth/me` puis, seulement sur 401 initial, POST `/api/auth/guest`, sauf sur les pages de confirmation/récupération ou lorsque la confirmation est en attente. Les autres erreurs SHALL ne provoquer ni identité fictive ni boucle de création.

#### Scenario: Accès direct sans session
- **WHEN** une personne non connectée ouvre directement une page privée comme `/library` ou `/study/:id`
- **THEN** l'application attend l'initialisation, crée ou restaure un invité après le seul 401 initial, puis rend uniquement ses données autorisées ; si l'initialisation échoue ou est suspendue, aucun contenu privé n'est affiché et une reprise explicite est proposée, sans retour externe non sûr.

#### Scenario: Lecture publique et action authentifiée
- **WHEN** une personne non connectée ouvre le fil, un profil public ou le détail d'un paquet public/non listé, puis demande une action sociale ou une révision
- **THEN** la lecture autorisée reste disponible sans session, mais l'action exige une session invitée ou permanente confirmée par le serveur ; un paquet privé d'autrui reste inaccessible même par lien direct.

#### Scenario: Confirmation ou récupération en cours
- **WHEN** la page initiale concerne vérification, oubli ou reset de mot de passe, ou que l'onglet attend une confirmation d'inscription
- **THEN** aucun invité n'est créé automatiquement ; seul un booléen non secret de confirmation en sessionStorage peut maintenir cette attente, jusqu'à la confirmation puis la connexion explicite.

## ADDED Requirements

### Requirement: Avertissement et sortie du profil temporaire
L'interface SHALL expliquer la dépendance au navigateur et le risque de perte d'accès, proposer l'inscription conservant le profil et prévenir que login ne fusionne pas les contenus. La sortie invitée SHALL demander confirmation, rester sans effet si annulée et retirer l'identité après succès serveur sans recréation silencieuse. Une reprise explicite ou un rechargement SHALL permettre une nouvelle initialisation.

#### Scenario: Annulation ou succès de sortie
- **WHEN** un invité choisit de quitter son profil puis annule ou confirme
- **THEN** l'annulation préserve la session et le contenu affiché ; après succès serveur, les cookies sont retirés et l'état de sortie est affiché sans suppression des données ni création automatique d'un invité de remplacement.

#### Scenario: Échec de sortie
- **WHEN** la demande de logout échoue
- **THEN** l'interface conserve le profil affiché, expose une erreur utile et n'annonce pas une sortie réussie.

#### Scenario: Connexion existante ou perte du cookie
- **WHEN** un invité envisage de se connecter à un compte existant ou perd ses cookies
- **THEN** l'interface distingue la conversion conservant le contenu de la connexion sans transfert ni fusion et prévient que la disparition des cookies peut empêcher définitivement de retrouver le profil temporaire ; sans récupération email avant conversion ni purge quotidienne, les 400 jours demandés au navigateur ne garantissent pas la conservation du cookie.

### Requirement: Reprise explicite et isolation des identités
L'interface SHALL effacer l'identité et les vues sensibles lors d'un 401 métier, sans POST invité automatique ni boucle de redirection. Elle SHALL proposer une reprise explicite, ignorer les réponses tardives d'une ancienne identité et séparer vues privées et brouillons par `_id`. Aucun JWT, token ou donnée locale ne SHALL servir d'autorité d'identité ; les brouillons de contenu et le booléen de confirmation ne SHALL pas authentifier l'utilisateur.

#### Scenario: Expiration pendant une action
- **WHEN** une action métier retourne 401 après l'initialisation
- **THEN** l'état sensible est invalidé et une relance explicite est proposée ; le cookie durable encore valide peut restaurer le même User via le serveur, sans boucle automatique.

#### Scenario: Réponse tardive après changement d'identité
- **WHEN** une ancienne requête aboutit après sortie ou changement de User
- **THEN** elle ne repeuple pas les données du nouveau profil et aucun brouillon d'une autre identité n'est restauré comme sien.