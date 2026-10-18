# Why

L'installation utilisateur repose sur MongoDB 4.4 standalone. Le refus systématique de cette topologie et la détection reposant uniquement sur `hello` empêchent son utilisation, indépendamment d'un éventuel échec d'authentification.

# What Changes

- Détecter replica set/mongos ou standalone ; utiliser `isMaster` si `hello` est inconnu.
- Garder les transactions sur les topologies compatibles ; accepter un mode dégradé standalone avec une file de mutations par connexion dans un seul processus API.
- Ajouter `MONGODB_TRANSACTIONS=auto|required`, défaut `auto`, et un avertissement sans ambiguïté sur les écritures partielles, l'absence de rollback et les lectures intermédiaires.
- Préserver authentification, permissions, validations et contraintes uniques ; ne pas contourner le code 18 et ne modifier aucun serveur MongoDB distant.

# Capabilities

## Modified Capabilities

- `experience` : exploitation à deux niveaux de garanties explicitement configurables.

# Impact

Backend, tests isolés et documentation. Aucun changement du contrat métier frontend. MongoDB 4.4 étant en fin de support, une mise à niveau est recommandée ; le fallback de commande est testé par simulation, pas par certification sur un binaire 4.4.