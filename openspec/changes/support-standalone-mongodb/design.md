# Context

Le serveur utilisateur est une instance MongoDB standalone. La commande `hello` peut être absente de MongoDB 4.4. L'authentification reste nécessaire et indépendante du mode de transactions.

# Decisions

- Détection `hello`, fallback `isMaster` seulement sur `CommandNotFound`/code 59 ; aucune nouvelle tentative avec une autre authentification.
- En mode `auto`, transactions Mongoose pour replica set/mongos ; file FIFO des mutations partagée par connexion pour standalone. En mode `required`, standalone refusé avant l'écoute HTTP.
- Aucun retry automatique du bloc métier sans transaction, aucun rollback simulé. Les validations précèdent les écritures ; une dépublication retire la visibilité avant le nettoyage social, et les suppressions de parents suivent le nettoyage des enfants.
- Ne jamais considérer une file locale comme un verrou distribué. Standalone nécessite un seul processus API et n'isole pas les lectures concurrentes. Une interruption peut laisser un nettoyage ou un réordonnancement partiel, à examiner avant relance.

# Risks / Trade-offs

Le mode standalone abandonne explicitement l'atomicité multi-documents, même si les permissions, les index et les validations demeurent actifs. Un replica set et `MONGODB_TRANSACTIONS=required` restent recommandés pour les garanties fortes. MongoDB 4.4 est obsolète et non certifié par une exécution réelle de cette version.

# Validation

Tests HTTP sur MongoDB standalone et replica set éphémères, tests unitaires de détection/fallback, FIFO, libération après erreur et absence de retry. Aucune mutation sur la base utilisateur, aucun secret affiché.

# Connection follow-up

La connexion suit le principe de geopinpoint : `getMongo()` partage une promesse et un client, avec `MONGODB_URI` et un `MONGODB_DB` facultatif. Une base explicitement configurée prend priorité sur la base URI ; en son absence, la sélection URI est conservée. Mongoose reste utilisé pour les modèles et connect-mongo réutilise son client ainsi que la base effective. Seul Mongoose ferme le client partagé. Il n'existe pas de repli fichier JSON : un refus d'authentification doit rester visible. La route `/` fournit un accueil JSON sans secrets ; l'authentification utilisateur se fait sur le frontend, jamais directement auprès de MongoDB depuis le navigateur.