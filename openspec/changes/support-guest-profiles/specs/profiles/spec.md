## MODIFIED Requirements

### Requirement: Modification réservée au propriétaire
Le système SHALL permettre uniquement au propriétaire, invité ou permanent, de modifier son nom d'affichage, sa biographie et l'URL de son avatar. Le username SHALL rester l'identifiant public choisi à l'inscription dans le MVP, ou généré pour un invité ; seule la conversion par inscription SHALL remplacer le username invité par celui soumis, sans changer le `_id`, les propriétaires ou les contenus. Les URL d'avatar SHALL être HTTP(S) ou vides ; les modifications invalides SHALL produire une erreur sans corrompre le profil.

#### Scenario: Mise à jour personnelle
- **WHEN** le propriétaire enregistre un nom d'affichage, une biographie et un avatar valides
- **THEN** le profil public reflète ces valeurs après rechargement sans changer le username.

#### Scenario: Modification par autrui
- **WHEN** un autre utilisateur tente de modifier le profil depuis l'API
- **THEN** l'opération est refusée même si l'action était masquée dans l'interface et les informations restent inchangées.

#### Scenario: Conservation lors de la conversion
- **WHEN** le propriétaire invité convertit son profil par une inscription valide
- **THEN** le username et le nom soumis remplacent ceux générés, mais le `_id`, la biographie, l'avatar et toutes les références de propriété restent inchangés.

## ADDED Requirements

### Requirement: Profil temporaire identifiable
Le système SHALL générer un username unique conforme et un nom d'affichage pour chaque nouvel invité, et SHALL exposer le booléen public `isGuest` sans email ni secret d'authentification. L'interface propriétaire SHALL afficher un état « Profil temporaire » et une action de conservation par inscription, sur ordinateur et mobile. Le profil SHALL conserver les mêmes règles de lecture publique et d'édition propriétaire que les comptes permanents, sans purge quotidienne.

#### Scenario: Profil généré et conservation proposée
- **WHEN** une personne reçoit un nouveau profil invité
- **THEN** elle voit son identité générée, son statut temporaire et l'action de conservation ; son profil public ne dévoile aucun secret et un autre utilisateur ne peut pas le modifier.

#### Scenario: Passage au jour suivant
- **WHEN** un invité revient un autre jour avec un accès encore valide
- **THEN** il retrouve le même profil et ses contenus, sans régénération quotidienne du nom ou remise à zéro.