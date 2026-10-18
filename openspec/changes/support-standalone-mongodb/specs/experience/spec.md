## MODIFIED Requirements

### Requirement: Exploitation sécurisée et vérifiable
Le système SHALL être déployable avec configuration externe, HTTPS en production et sessions MongoDB. Il SHALL exposer des vérifications de vie et de disponibilité distinctes et proposer `MONGODB_TRANSACTIONS=auto|required`. Le mode `auto` SHALL utiliser les transactions sur replica set/mongos et accepter standalone en mode dégradé mono-processus avec un avertissement explicite : absence de rollback, lectures intermédiaires et écritures partielles possibles. Le mode `required` SHALL refuser standalone. Le système SHALL préserver les contrôles d'accès et ne pas introduire de service payant superflu.

#### Scenario: Stockage indisponible ou incompatible
- **WHEN** la base devient indisponible après démarrage ou qu'une instance standalone est utilisée avec le mode `required`
- **THEN** la disponibilité indique l'échec lors de la panne, le contrôle de vie reste distinct et la configuration incompatible empêche le démarrage avant l'écoute HTTP.

#### Scenario: Standalone en mode automatique
- **WHEN** le serveur détecte standalone avec le mode `auto`
- **THEN** il démarre sans transactions, sérialise les mutations dans un seul processus et avertit que l'atomicité multi-documents et le rollback ne sont pas garantis.

#### Scenario: Transactions exigées
- **WHEN** le mode `required` est configuré avec une instance standalone
- **THEN** le démarrage échoue explicitement avant d'écouter les requêtes.

#### Scenario: Commande de découverte ancienne
- **WHEN** la commande `hello` échoue avec `CommandNotFound` ou le code 59
- **THEN** la découverte utilise `isMaster`, sans masquer les erreurs d'authentification ou réseau.