## Purpose

Créer et modifier manuellement des cartes organisées dans un paquet, sans perte silencieuse des saisies. Chaque face est un texte, une image HTTP(S), ou les deux. Source : [spécification manuelle, section 6](../../../../spec-manuelle/spec.md).

## Requirements

### Requirement: Parcours de création d'un paquet
L'interface SHALL proposer depuis « Créer » un « Nouveau paquet », la saisie d'un titre et d'une description facultative, le choix facultatif d'un cours et d'un chapitre, puis l'ajout de cartes et l'enregistrement. Elle SHALL permettre de garder le paquet privé ou de publier après ajout d'au moins une carte, sans imposer de cours existant.

#### Scenario: Première création sans bibliothèque existante
- **WHEN** un utilisateur sans cours crée un paquet puis sa première carte
- **THEN** il peut enregistrer le paquet privé sans rattachement et choisir ensuite de le publier.

### Requirement: Cartes recto-verso textuelles ou illustrées
Le système SHALL associer chaque carte à un paquet valide et conserver un identifiant, un recto, un verso, une position et les dates de création et modification. Chaque face SHALL contenir un texte, une adresse HTTP(S) d’image d’au plus 2048 caractères, ou les deux. Le texte SHALL être affiché brut, sans exécuter de HTML, et une URL non HTTP(S), y compris `javascript:`, SHALL être refusée comme source d’image. Une face vide des deux côtés SHALL être refusée.

#### Scenario: Enregistrement et restitution d'une carte
- **WHEN** le propriétaire enregistre une question et une réponse contenant des caractères de balisage, ou une face composée seulement d’une image HTTP(S)
- **THEN** les textes sont restitués comme texte et l’image est affichée par son URL, dans le bon paquet et à leur position, sans interprétation HTML.

### Requirement: Création rapide d'une carte
Depuis `/create`, l'interface SHALL proposer **Créer une flashcard** avant le formulaire complet du paquet. Cette action SHALL enregistrer une seule carte via `POST /api/cards/quick`, dans le paquet choisi ou, sans choix, dans le paquet privé unique « Général » créé pour le compte. Les images restent facultatives.

#### Scenario: Carte ajoutée sans préparer un paquet
- **WHEN** l'utilisateur saisit une question et une réponse sans choisir de paquet
- **THEN** la carte est ajoutée au paquet privé « Général », créé une seule fois, et un message confirme le rangement.

### Requirement: Éditeur complet et validation visible
L'éditeur SHALL afficher « Question ou mot », « Réponse », « Enregistrer », « Annuler », « Ajouter une carte », modifier/supprimer, les contrôles d'ordre et le nombre de cartes. Il SHALL refuser les faces vides après trim ou dépassant la limite serveur, avec erreurs près des champs et conservation des autres saisies. Aucun texte existant SHALL être tronqué automatiquement.

#### Scenario: Carte invalide
- **WHEN** une face est vide après suppression des espaces périphériques ou dépasse la limite configurée
- **THEN** l'enregistrement est refusé, le champ concerné affiche une erreur et les autres saisies restent présentes.

#### Scenario: Modification et annulation
- **WHEN** le propriétaire modifie une carte puis choisit « Annuler »
- **THEN** la version enregistrée reste inchangée ; après un enregistrement réussi, les nouveaux textes et le compteur de cartes reflètent les données persistées.

### Requirement: Limite serveur configurable et projection publique
`CARD_TEXT_MAX_LENGTH` SHALL être un entier de 1 à 10000 inclus, défaut 10000, validé au démarrage. Le serveur SHALL valider POST/PATCH après trim en unités UTF-16 ; les modèles SHALL conserver le plafond 10000. `GET /api/config` SHALL exposer uniquement `{ cardTextMaxLength }` publiquement, sans secret.

#### Scenario: Limite serveur invalide ou dépassée
- **WHEN** la configuration n'est pas un entier de 1 à 10000, ou qu'un POST/PATCH soumet une face au-delà de la limite valide
- **THEN** la configuration invalide empêche le démarrage ; avec une configuration valide, l'API expose sa seule limite publique et refuse la face trop longue.

### Requirement: Alignement de l'éditeur sur la configuration publique
Avant montage, l'interface SHALL charger la limite publique pour les maxlength, compteurs et validations, y compris des brouillons restaurés. Sur panne ou réponse invalide, elle SHALL utiliser le repli 10000 sans contourner la validation serveur, qui reste autoritaire et peut imposer une limite plus basse.

#### Scenario: Configuration publique réduite et brouillon restauré
- **WHEN** le backend configure une limite de cinq caractères et que l'éditeur restaure un brouillon dépassant cette limite sur l'une des faces
- **THEN** les deux maxlength et les compteurs reflètent cinq, la validation bloque toute sauvegarde avant mutation et le serveur refuse également les faces trop longues par POST/PATCH.

#### Scenario: Configuration publique indisponible
- **WHEN** le chargement de configuration échoue ou retourne une limite non entière ou hors de 1 à 10000
- **THEN** l'interface démarre avec le repli 10000, conserve les textes sans troncature et affiche le refus serveur si sa limite effective est plus basse.

### Requirement: Ordre persistant des cartes
Le système SHALL permettre au propriétaire de réordonner ses cartes et conserver cet ordre pour l'édition et la révision. Un réordonnancement global SHALL être une permutation exacte des cartes du paquet, sans doublon ni identifiant étranger ; les égalités de position SHALL être départagées par identifiant.

#### Scenario: Réordonnancement valide puis invalide
- **WHEN** le propriétaire déplace des cartes puis soumet une liste contenant un doublon ou une carte d'un autre paquet
- **THEN** le premier ordre valide est conservé après rechargement et la liste invalide est refusée sans ordre partiellement enregistré.

### Requirement: Propriété et cohérence avec la publication
Le système SHALL réserver l'ajout, la modification, la suppression et le réordonnancement des cartes au propriétaire du paquet. Supprimer la dernière carte d'un paquet public SHALL le rendre privé et supprimer atomiquement sa publication et ses références sociales, afin de ne jamais exposer une publication vide après validation de la mutation.

#### Scenario: Écriture étrangère
- **WHEN** un utilisateur connaissant l'identifiant d'une carte publique tente de la modifier ou supprimer
- **THEN** l'API refuse l'écriture et conserve les cartes du propriétaire.

#### Scenario: Dernière carte publique supprimée
- **WHEN** le propriétaire supprime la dernière carte d'un paquet publié, y compris pendant une publication concurrente
- **THEN** le paquet vide est privé et ne possède plus de publication, de J'aime ou d'enregistrement communautaire.

### Requirement: Conservation des brouillons en cas d'échec
L'interface SHALL informer d'une erreur réseau et conserver les modifications saisies tant que l'utilisateur n'a pas choisi de les abandonner. Elle SHALL permettre de réessayer sans annoncer à tort une sauvegarde réussie.

#### Scenario: Échec réseau pendant une sauvegarde
- **WHEN** la sauvegarde échoue pendant l'édition d'une carte
- **THEN** un message et une action de nouvelle tentative sont affichés, les champs restent remplis et aucune confirmation de succès n'est affichée.