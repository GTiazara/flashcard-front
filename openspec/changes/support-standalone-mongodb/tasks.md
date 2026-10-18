# Tasks

- [x] Détecter la topologie avec fallback limité à une commande inconnue.
- [x] Ajouter les modes automatique/requis sans modifier les identifiants utilisateur.
- [x] Garder les transactions existantes et ajouter la file mono-processus standalone sans retry.
- [x] Adapter l'ordre des écritures pour retirer la visibilité avant nettoyage.
- [x] Tester authentification, permissions, CRUD, publication, social et cascades sur une base standalone isolée, et conserver les tests replica set.
- [x] Documenter les limites de concurrence, l'absence de rollback et la fin de support MongoDB 4.4.
- [ ] Valider sur l'installation utilisateur après résolution indépendante de son authentification MongoDB.