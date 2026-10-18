## Purpose

Présenter les créateurs et leurs paquets publics sans divulguer les données personnelles ou les contenus privés. Source dédoublonnée : [spécification manuelle, sections 4.2 et 10](../../../../../../spec-manuelle/spec.md).

## ADDED Requirements

### Requirement: Profil public consultable
Le système SHALL proposer un profil identifié par le username, affichant avatar facultatif, nom d'affichage, username, biographie facultative, nombre de paquets publics et liste paginée de ces paquets. La page `/profile/:username` et son API SHALL rester consultables avec ou sans session, même sans publication, en servant les mêmes données publiques minimales. Toute modification SHALL rester réservée au propriétaire authentifié. Les compteurs et listes d'abonnements SHALL rester hors du MVP.

#### Scenario: Profil avec publications
- **WHEN** un utilisateur connecté ou un visiteur anonyme visite `/profile/:username`
- **THEN** il voit l'identité publique du créateur et uniquement ses paquets publics, avec leur nombre et la possibilité de parcourir la liste.

#### Scenario: Profil sans publication
- **WHEN** le profil existe sans aucun paquet public
- **THEN** l'identité du créateur et un état vide explicite sont affichés, sans page blanche ni erreur de profil absent.

### Requirement: Modification réservée au propriétaire
Le système SHALL permettre uniquement au propriétaire de modifier son nom d'affichage, sa biographie et l'URL de son avatar. Le username SHALL rester l'identifiant public choisi à l'inscription dans le MVP. Les URL d'avatar SHALL être HTTP(S) ou vides ; les modifications invalides SHALL produire une erreur sans corrompre le profil.

#### Scenario: Mise à jour personnelle
- **WHEN** le propriétaire enregistre un nom d'affichage, une biographie et un avatar valides
- **THEN** le profil public reflète ces valeurs après rechargement sans changer le username.

#### Scenario: Modification par autrui
- **WHEN** un autre utilisateur tente de modifier le profil depuis l'API
- **THEN** l'opération est refusée même si l'action était masquée dans l'interface et les informations restent inchangées.

### Requirement: Projection publique sans email
Le système SHALL exclure des réponses de profil, y compris de modification par le propriétaire, l'adresse email, le mot de passe ou son hash, les jetons, les données de session, les cours et paquets privés ou non listés, l'historique détaillé des révisions et toute autre donnée non destinée au public. La confidentialité SHALL être appliquée côté serveur, pas seulement par masquage visuel.

#### Scenario: Inspection des réponses et du rendu
- **WHEN** un visiteur API, un utilisateur connecté ou le propriétaire consulte une réponse de profil
- **THEN** ni le JSON ni le rendu ne contiennent d'email, d'information d'authentification ou de contenu privé ; seules les données publiques autorisées sont présentes.

### Requirement: Paramètres de confidentialité du MVP
Le système SHALL rendre explicite la politique de confidentialité du profil : identité publique minimale, biographie et avatar facultatifs contrôlés par le propriétaire, et visibilité réglable par paquet. Il SHALL permettre au propriétaire de retirer ses champs facultatifs et de rendre un paquet privé ou non listé pour le retirer du profil public ; l'interface SHALL ne proposer que des protections réellement prises en charge par le serveur.

#### Scenario: Réduction des informations publiques
- **WHEN** le propriétaire vide sa biographie et son avatar puis rend privé un paquet publié
- **THEN** le profil utilise une présentation de remplacement, le paquet disparaît de sa liste publique et aucune information privée n'est ajoutée en compensation.