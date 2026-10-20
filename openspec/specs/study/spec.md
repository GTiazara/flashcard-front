## Purpose

Réviser simplement un paquet accessible avec des cartes interactives et un bilan factuel, sans prétendre mesurer la maîtrise. Source : [spécification manuelle, section 7](../../../../spec-manuelle/spec.md).

## Requirements

### Requirement: Démarrage autorisé sur paquet non vide
Le système SHALL permettre à un utilisateur connecté d'ouvrir un paquet autorisé et de choisir « Commencer à réviser ». Il SHALL refuser le démarrage sur un paquet vide ou devenu inaccessible ; pour un paquet vide, l'interface SHALL désactiver l'action et inviter le propriétaire à ajouter des cartes.

#### Scenario: Paquet vide
- **WHEN** le propriétaire ouvre un paquet sans carte ou tente de créer directement une session via l'API
- **THEN** l'interface explique pourquoi la révision est indisponible et le serveur refuse l'enregistrement d'une session sur ce paquet vide.

#### Scenario: Paquet privé d'autrui
- **WHEN** un utilisateur tente de réviser un paquet privé d'un autre propriétaire
- **THEN** aucun contenu ni session de révision ne lui est fourni, même s'il connaît l'identifiant.

### Requirement: Révision recto-verso sans mutation
L'écran SHALL afficher le titre du paquet, une grande carte centrée et une action « Retourner la carte ». Chaque nouvelle carte SHALL commencer au recto, puis permettre d'afficher le verso sans modifier les textes enregistrés. Le retournement SHALL être animé en rotation 3D dans l'aperçu, la révision et le fil ; `prefers-reduced-motion` SHALL le rendre instantané. La face au dos SHALL être masquée une fois l'animation terminée.

#### Scenario: Retournement d'une carte
- **WHEN** l'utilisateur démarre la révision puis retourne la carte
- **THEN** la question apparaît d'abord et la réponse ensuite, sans requête de modification du contenu.

### Requirement: Navigation et progression fluides
L'écran SHALL avancer à la carte suivante par le premier repère choisi, proposer « Précédente » et « Continuer » seulement pour revenir sur une carte déjà annotée, et une action de sortie. Il SHALL ne pas proposer « Suivante », qui comptait une carte sans repère. La navigation SHALL respecter l'ordre du paquet, fonctionner sans rechargement complet et mettre à jour un indicateur « Carte n sur total » distinct du nombre de repères. Les bornes SHALL empêcher de naviguer hors du paquet et l'utilisateur SHALL pouvoir quitter à tout moment.

#### Scenario: Navigation avant et arrière
- **WHEN** l'utilisateur choisit un repère puis revient à la carte précédente
- **THEN** chaque carte s'affiche au recto, l'indicateur reflète sa position, le nombre de repères ne change pas au retour, et la page n'est pas rechargée.

#### Scenario: Sortie anticipée
- **WHEN** l'utilisateur quitte avant la dernière carte
- **THEN** la session se termine sans bloquer la navigation et sans inventer une session complète.

### Requirement: Résumé factuel et historique personnel
À la fin d'une session, l'interface SHALL présenter le nombre de cartes uniques parcourues, une durée approximative et, si des cartes ont été annotées, un taux issu des repères « Je ne connais pas », « J'ai un doute » et « Je connais ». Ce taux SHALL valoir la moyenne de 0, 0,5 et 1, sans répétition espacée ni certification de maîtrise. Revenir sur une même carte SHALL ne pas augmenter le nombre de cartes parcourues et SHALL conserver un seul repère, le dernier choisi. Le système SHALL permettre d'enregistrer et consulter un historique personnel paginé.

#### Scenario: Fin de session
- **WHEN** l'utilisateur termine sa révision
- **THEN** un résumé indique les cartes uniques parcourues, le temps approximatif et le taux des cartes annotées ; l'interface persiste ces nombres dans les bornes du contrat, sans conclure à une connaissance certifiée.

#### Scenario: Retours sur une carte déjà parcourue
- **WHEN** l'utilisateur parcourt la première carte, la deuxième, puis revient sur la première et la deuxième
- **THEN** le résumé et le payload UI indiquent deux cartes parcourues, pas quatre passages ; l'API reste compatible avec les clients déclarant des visites répétées.

### Requirement: Persistance compatible des métriques déclaratives
L'interface SHALL envoyer le nombre unique dans `cardsVisited`, borné à 100000, et une durée entière de 1 à 86400 secondes. L'API SHALL rester compatible avec 1 à 100000 visites, y compris répétées ; cette permissivité SHALL ne pas redéfinir le compteur UI ni certifier une activité.

#### Scenario: Client déclarant des visites répétées
- **WHEN** un client authentifié soumet des visites répétées sur un paquet accessible non vide, dans les bornes autorisées
- **THEN** l'API accepte la session sans l'interpréter comme un nombre certifié de cartes distinctes ou une maîtrise.

#### Scenario: Historique et changement de visibilité
- **WHEN** un utilisateur consulte son historique après qu'un paquet révisé est devenu privé chez un autre propriétaire
- **THEN** seuls ses propres résumés sont accessibles, sans charger les cartes ni les données désormais privées du paquet ; l'historique d'autrui n'est jamais exposé.