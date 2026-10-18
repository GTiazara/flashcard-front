## Purpose

Découvrir et partager des paquets publics, les aimer et les enregistrer par référence, sans abonnements ni commentaires. Source : [spécification manuelle, sections 8 et 9](../../../../spec-manuelle/spec.md).

## Requirements

### Requirement: Publication unique d'un paquet non vide
Le système SHALL permettre uniquement au propriétaire de publier un paquet contenant au moins une carte. Une publication SHALL référencer le paquet sans copier toutes ses cartes, être unique par paquet et rendre uniquement ce paquet public ; répéter la publication SHALL être idempotent.

#### Scenario: Publication valide ou vide
- **WHEN** un propriétaire publie un paquet non vide puis renouvelle l'action, ou tente de publier un paquet vide
- **THEN** le premier paquet possède une seule publication et devient public ; le paquet vide est refusé sans publication.

### Requirement: Retrait public cohérent
Le système SHALL retirer du fil, de la recherche et des profils publics un paquet supprimé ou passé de public à privé ou non listé. La dépublication SHALL supprimer sa publication, ses J'aime et ses enregistrements communautaires atomiquement ; elle SHALL retirer les accès précédemment accordés par la publication sans bloquer la lecture par capacité d'un paquet devenu non listé.

#### Scenario: Dépublication pendant une interaction
- **WHEN** le propriétaire dépublie ou supprime un paquet pendant qu'un autre utilisateur l'aime ou l'enregistre
- **THEN** après validation des opérations, il ne subsiste aucune publication ni relation sociale vers ce paquet retiré ; les listes suivantes ne l'affichent plus.

### Requirement: Fil paginé centré sur l'apprentissage
Le fil SHALL présenter avatar, nom d'affichage et username du créateur, titre, description, matière/niveau si renseignés, nombre de cartes, date de publication, total de J'aime, aperçu d'une carte et actions « Réviser », « Enregistrer », « J'aime ». Il SHALL charger plusieurs publications par lots bornés, sans récupérer tout le fil à la fois.

#### Scenario: Lecture et pagination du fil
- **WHEN** un utilisateur connecté ou un visiteur anonyme ouvre `/feed` puis demande la suite
- **THEN** les publications affichent leurs métadonnées et actions, et un lot borné supplémentaire est chargé sans télécharger d'emblée l'intégralité du fil.

### Requirement: Aperçu anonyme sans mutation sociale
`/feed` SHALL permettre la lecture anonyme de l'aperçu public. Les actions sociales et la révision persistée SHALL exiger une session, sans accorder de droit d'écriture à un visiteur.

#### Scenario: Invitation à se connecter
- **WHEN** un visiteur anonyme consulte le fil puis demande à aimer un paquet
- **THEN** il peut lire l'aperçu, mais l'action l'invite à se connecter sans enregistrer de J'aime anonyme.

### Requirement: Tris récents et populaires déterministes
Le système SHALL proposer « Récents », trié par date de publication décroissante puis identifiant décroissant, et « Populaires », trié par nombre total de J'aime décroissant puis date de publication et identifiant décroissants. Le classement SHALL être calculé avant pagination, sans fenêtre temporelle ni recommandation algorithmique complexe.

#### Scenario: Popularité globale
- **WHEN** un paquet ancien reçoit davantage de J'aime que les publications récentes
- **THEN** il précède celles-ci dans « Populaires », quelle que soit sa page initiale ; les égalités sont départagées par date puis identifiant.

### Requirement: Recherche publique sans fuite
Le système SHALL rechercher les paquets publics sur le titre, la description, le username et le nom d'affichage du créateur, de manière littérale et insensible à la casse. La recherche SHALL s'appliquer avant pagination et ne jamais exposer de paquet privé ou non listé.

#### Scenario: Recherche par auteur ou texte
- **WHEN** l'utilisateur saisit un nom de créateur ou un texte comprenant des caractères spéciaux
- **THEN** seuls les paquets publics correspondant littéralement aux champs autorisés sont retournés, ou un état « aucun résultat » est présenté.

### Requirement: J'aime réversible et unique
Le système SHALL permettre à un utilisateur connecté d'aimer ou ne plus aimer une publication publique, au nom de sa propre session uniquement. Un seul J'aime par utilisateur et publication SHALL être garanti par une contrainte unique en base ; l'action SHALL être idempotente et mettre à jour le compteur affiché après succès.

#### Scenario: Répétition et retrait d'un J'aime
- **WHEN** un utilisateur répète l'action aimer puis retire son J'aime
- **THEN** un seul J'aime est compté avant retrait et aucun après, sans doublon même sous requêtes concurrentes.

### Requirement: Bibliothèque des enregistrements par référence
Le système SHALL permettre à un utilisateur connecté d'enregistrer un paquet public dans une section « Enregistrés » paginée et de retirer cet enregistrement sans supprimer l'original. L'enregistrement SHALL être une référence unique par utilisateur et paquet, sans copie ni droit de modification ; les cartes consultées SHALL rester celles du paquet d'origine.

#### Scenario: Enregistrement puis retrait
- **WHEN** un utilisateur enregistre deux fois un paquet d'autrui, consulte ses cartes puis retire l'enregistrement
- **THEN** une seule référence apparaît dans « Enregistrés », aucune action d'édition étrangère n'est autorisée et le retrait laisse l'original intact.

#### Scenario: Paquet enregistré retiré de la communauté
- **WHEN** le propriétaire rend privé ou non listé un paquet précédemment enregistré
- **THEN** il disparaît des enregistrements de la communauté et son ancienne référence ne confère aucun accès privé.