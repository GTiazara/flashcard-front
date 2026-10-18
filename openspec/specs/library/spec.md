## Purpose

Organiser une bibliothèque personnelle de cours, chapitres et paquets tout en garantissant la propriété et la confidentialité. Source dédoublonnée : [spécification manuelle, sections 4.3, 5 et 6.1](../../../../spec-manuelle/spec.md).

## Requirements

### Requirement: Organisation personnelle et cours
Le système SHALL présenter la hiérarchie utilisateur → cours → chapitres → paquets → cartes et permettre au propriétaire de créer, consulter, modifier et supprimer ses cours. Un cours SHALL contenir un identifiant, un propriétaire, un titre obligatoire, une description et une couleur ou icône facultatives, ainsi que les dates de création et modification.

#### Scenario: Gestion d'un cours personnel
- **WHEN** le propriétaire crée un cours puis modifie son titre, sa description, sa couleur ou son icône
- **THEN** les informations sont conservées dans sa bibliothèque et il peut consulter ses chapitres.

#### Scenario: Isolation entre utilisateurs
- **WHEN** un autre utilisateur tente de lister, consulter ou modifier un cours privé ou ses chapitres par leur identifiant
- **THEN** aucun contenu n'est exposé et l'accès est refusé côté serveur, indépendamment de l'interface.

### Requirement: Chapitres ordonnés
Le système SHALL permettre au propriétaire de créer, consulter, modifier, supprimer et réordonner les chapitres d'un cours lui appartenant. Chaque chapitre SHALL avoir un identifiant, une référence au cours, un titre, une description facultative, une position entière positive ou nulle et une date de création ; l'affichage SHALL être déterministe par position puis identifiant.

#### Scenario: Réorganisation d'un chapitre
- **WHEN** le propriétaire modifie la position d'un chapitre
- **THEN** le nouvel ordre est conservé après rechargement et les égalités de position sont départagées par identifiant.

#### Scenario: Rattachement interdit
- **WHEN** un utilisateur tente de créer un chapitre dans le cours d'un autre utilisateur
- **THEN** l'association est refusée et aucun chapitre étranger n'est créé.

### Requirement: Paquets autonomes ou rattachés
Le système SHALL permettre au propriétaire de créer, consulter, modifier et supprimer un paquet avec identifiant, propriétaire, titre, dates de création et modification, et facultativement chapitre, description, matière, niveau et image de couverture. Un paquet SHALL pouvoir rester sans cours ni chapitre, être déplacé vers un chapitre du même propriétaire ou en être détaché. Il SHALL être privé par défaut et pouvoir rester vide pendant la création.

#### Scenario: Création autonome puis rattachement
- **WHEN** un utilisateur crée un paquet avec seulement un titre, puis choisit un chapitre personnel
- **THEN** le paquet vide est d'abord enregistré comme privé et autonome, puis apparaît dans le chapitre choisi sans dupliquer ses cartes.

#### Scenario: Détachement et association invalide
- **WHEN** le propriétaire détache son paquet ou tente de l'associer à un chapitre inexistant ou appartenant à autrui
- **THEN** le détachement conserve le paquet et ses cartes, tandis que l'association invalide est refusée.

### Requirement: Visibilité et liens non listés
Le système SHALL réserver `private` au propriétaire, autoriser `unlisted` par ID comme capacité et rendre `public` lisible par tous. Un paquet non listé SHALL être absent du fil, recherche, profils publics et enregistrements. `/decks/:id` SHALL permettre la lecture anonyme selon les droits API, sans droit d'écriture ; bibliothèque, création/édition et révision SHALL rester authentifiées.

#### Scenario: Lecture privée et partage ciblé
- **WHEN** une personne autre que le propriétaire connaît l'ID d'un paquet privé ou non listé
- **THEN** le paquet privé reste inaccessible, mais le paquet non listé est lisible par son ID via l'API même anonymement, sans devenir découvrable ni modifiable.

#### Scenario: Publication sans propagation
- **WHEN** un propriétaire rend un paquet public
- **THEN** ses cours, ses chapitres et ses autres paquets ne changent pas de visibilité et aucune liste publique n'expose leurs contenus privés.

### Requirement: Suppressions en cascade confirmées
Le système SHALL demander une confirmation avant une suppression destructive et expliquer sa portée. Supprimer un cours SHALL supprimer ses chapitres et leurs paquets ; supprimer un chapitre SHALL supprimer ses paquets ; supprimer un paquet SHALL supprimer ses cartes, publication, J'aime, références d'enregistrement et historique associé, sans toucher aux paquets autonomes ou déjà détachés.

#### Scenario: Annulation et confirmation
- **WHEN** le propriétaire annule puis confirme la suppression d'un cours contenant des chapitres et paquets
- **THEN** l'annulation ne modifie rien ; après confirmation, l'ensemble des dépendances concernées disparaît, mais les paquets détachés subsistent.

### Requirement: Intégrité des droits et des dépendances
Le système SHALL vérifier côté serveur la propriété et la cohérence des associations, appliquer les contraintes de données en base et rendre les mutations liées atomiques, y compris en concurrence. Aucune mutation SHALL accepter un propriétaire imposé par le client ; les écritures directes hors API ne sont pas un chemin d'accès utilisateur autorisé.

#### Scenario: Échec d'une cascade
- **WHEN** une erreur survient pendant une suppression liée
- **THEN** la mutation est annulée sans cascade partielle ni référence sociale orpheline produite par cette opération.

#### Scenario: Mutation d'une ressource étrangère
- **WHEN** un utilisateur tente de modifier ou supprimer un paquet ou un chapitre d'autrui via l'API
- **THEN** l'opération est refusée même si ses identifiants sont connus et aucune ressource ne change de propriétaire.