## Purpose

Offrir une expérience française cohérente, responsive, accessible et exploitable dans le cloud pour créer, apprendre et partager. Source : [spécification manuelle, sections 1 à 3, 11 et 12](../../../../spec-manuelle/spec.md).

## Requirements

### Requirement: Navigation principale publique et protégée
L'application SHALL proposer aux utilisateurs connectés depuis les pages principales « Accueil » (`/feed`), « Bibliothèque » (`/library`), « Créer » (`/create`), « Réviser » (`/study`) et « Profil » (`/profile/:username`), avec un état actif visible.

#### Scenario: Entrée et navigation après connexion
- **WHEN** un utilisateur termine sa connexion puis change de section
- **THEN** il arrive sur `/feed`, conserve une navigation accessible et voit la section active mise à jour.

### Requirement: Accès privé et lecture publique autorisée
Les routes `/library`, `/create`, `/decks/:id/edit`, `/study` et `/study/:id` SHALL attendre une session avant rendu. `/feed`, `/profile/:username`, `/decks/:id` et les pages d'authentification, récupération et confirmation SHALL être ouverts sans session. Cette lecture ouverte SHALL respecter les permissions API ; toute écriture et révision persistée SHALL rester authentifiée.

#### Scenario: Accès direct sans session
- **WHEN** une personne non connectée ouvre directement une page privée comme `/library` ou `/study/:id`
- **THEN** elle est orientée vers la connexion sans rendu du contenu privé, et le retour éventuel reste limité à un chemin interne sûr.

#### Scenario: Lecture publique et action authentifiée
- **WHEN** une personne non connectée ouvre le fil, un profil public ou le détail d'un paquet public/non listé, puis demande une action sociale ou une révision
- **THEN** la lecture autorisée reste disponible sans session, mais l'action exige la connexion ; un paquet privé d'autrui reste inaccessible même par lien direct.

### Requirement: Retour après connexion sûr
Les retours après connexion SHALL se limiter aux chemins internes sûrs, sans URL externe, double slash initial, antislash ou caractère de contrôle ; à défaut, la destination SHALL être `/feed`.

#### Scenario: Destination externe ou ambiguë
- **WHEN** le paramètre de retour contient une URL externe, un double slash initial, un antislash ou un caractère de contrôle
- **THEN** la connexion ne redirige pas vers cette destination et utilise `/feed`.

### Requirement: Mise en page responsive et mobile
L'interface SHALL fonctionner sur smartphone, tablette et ordinateur sans débordement horizontal gênant. Sur mobile, elle SHALL afficher une navigation inférieure fixe, des cartes proches de la largeur disponible, des cibles tactiles suffisantes et des formulaires adaptés au clavier mobile. Sur ordinateur, elle SHALL utiliser une navigation latérale ou supérieure, un fil de largeur de lecture maîtrisée, une bibliothèque en grille et un éditeur adapté à plusieurs cartes.

#### Scenario: Changement de taille d'écran
- **WHEN** l'utilisateur consulte bibliothèque, fil, formulaires et révision sur mobile puis sur ordinateur
- **THEN** les contenus et actions restent lisibles et utilisables, et la navigation fixe ne masque ni champ actif ni action essentielle.

### Requirement: Identité visuelle et lisibilité
L'interface SHALL adopter un style moderne, professionnel, minimaliste et chaleureux, sans surcharge ni esthétique scolaire enfantine. Elle SHALL utiliser une typographie sans-serif moderne avec une hiérarchie cohérente et une palette claire à dominante violette, ajustable pour garantir un contraste accessible.

#### Scenario: Lecture des informations
- **WHEN** une page affiche titres, corps, métadonnées et actions
- **THEN** leur hiérarchie est identifiable sur chaque format d'écran et les états ne sont pas signalés par la couleur seule.

### Requirement: Composants réutilisables et accessibles
L'interface SHALL réutiliser des composants et variantes cohérents pour boutons, formulaires, cartes de cours, chapitres et flashcards, publications, avatars, badges de matière, menus, confirmations, erreurs, chargements et états vides. Les contrôles SHALL être étiquetés, utilisables au clavier et dotés d'un focus visible ; les modales SHALL gérer le focus sans empêcher leur fermeture.

#### Scenario: Utilisation au clavier
- **WHEN** un utilisateur navigue sans souris, remplit un formulaire et ouvre puis ferme une confirmation
- **THEN** les actions sont accessibles avec un focus visible, les erreurs sont associées aux champs et le focus revient au déclencheur après fermeture.

### Requirement: États d'interface explicites
Chaque page SHALL prévoir, selon le contexte, chargement, absence de données, erreur réseau, validation, utilisateur non connecté, aucun résultat et action réussie. L'interface SHALL afficher des messages français utiles et une action pertinente plutôt qu'une page blanche, et ne pas annoncer le succès d'une action échouée.

#### Scenario: Bibliothèque vide et recherche sans résultat
- **WHEN** l'utilisateur n'a aucun cours ou qu'une recherche ne trouve aucun paquet
- **THEN** un état explicite propose respectivement de créer un premier cours ou de modifier la recherche.

#### Scenario: Erreur puis nouvelle tentative
- **WHEN** une requête échoue puis réussit après une nouvelle tentative
- **THEN** l'erreur est lisible, une relance est possible, les saisies utiles sont conservées et le succès n'est annoncé qu'après confirmation du serveur.

### Requirement: Exploitation sécurisée et vérifiable
Le système SHALL être déployable avec configuration externe, HTTPS en production, sessions partagées entre instances et stockage transactionnel. Il SHALL exposer des vérifications de vie et de disponibilité distinctes, refuser un stockage incapable de garantir les transactions métier et ne pas introduire de service payant superflu.

#### Scenario: Stockage indisponible ou incompatible
- **WHEN** la base devient indisponible ou qu'un démarrage utilise un serveur sans support transactionnel
- **THEN** la disponibilité indique l'échec sans annoncer que le service est prêt ; un stockage incompatible empêche le démarrage normal, tandis que le contrôle de vie reste distinct lors d'une panne après démarrage.