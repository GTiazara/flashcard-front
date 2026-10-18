# Tasks

Les cases de réalisation et de tests ci-dessous consignent le travail déjà rapporté par les sous-agents et les contrats relus ; elles ne prétendent pas à une réexécution dans cette passe documentaire. Les réserves d'exploitation restent séparées.

## 1. Backend

- [x] 1.1 Même User invité, identité générée, champs permanents conditionnels et projections sans secrets.
- [x] 1.2 Cookie serveur opaque HttpOnly/Lax/Secure en production, 400 jours demandés, empreinte seule en DB, restauration de session et résistance à la fixation.
- [x] 1.3 Permissions CRUD/social/révision identiques, absence de purge quotidienne et de TTL User/contenu.
- [x] 1.4 Conversion atomique conditionnelle au même `_id`, conservation des propriétaires, révocation des anciens accès et absence de fusion au login.
- [x] 1.5 Confirmation configurable, compensation conditionnelle sur panne SMTP et limites crash documentées.
- [x] 1.6 Index email partiel et script de maintenance explicite ; démarrage sans suppression automatique d'index.

## 2. Frontend

- [x] 2.1 Initialisation mutualisée me → 401 → guest ; exclusion des pages sensibles et de la confirmation en attente.
- [x] 2.2 Navigation/permissions invitée, badge temporaire, conservation par register et avertissement avant login existant.
- [x] 2.3 Confirmation de sortie, retrait serveur des cookies, pas de recréation silencieuse après sortie ou 401 métier.
- [x] 2.4 Invalidation des réponses obsolètes et séparation des vues/brouillons par identité ; aucune identité JWT/localStorage.

## 3. Tests déjà exécutés par les sous-agents

- [x] 3.1 Build backend réussi ; 151 tests réussis, 6 ignorés seulement lors du passage replica set pour les cas spécifiques standalone.
- [x] 3.2 Build frontend strict réussi ; 46 tests unitaires réussis.
- [x] 3.3 46 E2E mockés desktop/mobile réussis (contrat simulé, pas preuve DB).
- [x] 3.4 2 E2E réels frontend/API/MongoDB éphémère réussis, dont restauration et conversion même `_id` ; nettoyage rapporté.
- [x] 3.5 Cas migration, concurrence et panne SMTP couverts en environnement isolé, sans migration utilisateur ni livraison SMTP réelle revendiquée.

## 4. Documentation et validation de cette passe

- [x] 4.1 Lire auth frontend, auth/modèles backend, README et specs authentication/profiles/experience.
- [x] 4.2 Créer proposition, design, tâches, vérification, métadonnées et deltas français à structure OpenSpec anglaise ; conserver les titres et tous les scénarios originaux des exigences MODIFIED.
- [x] 4.3 Actualiser le README racine avec accès temporaire, risques, liens et résultats attribués.
- [x] 4.4 Exécuter `openspec validate support-guest-profiles --strict` : changement valide après réduction des exigences ADDED trop longues et déplacement des précisions dans les scénarios.

## 5. Réserves avant exploitation

- [ ] 5.1 Vérifier l'accès à la DB utilisateur et résoudre tout code 18 sans contournement.
- [ ] 5.2 Réaliser sauvegarde, maintenance explicite et migration d'index sur la DB utilisateur si nécessaire, puis vérifier les index avant remise en service.
- [ ] 5.3 Recetter SMTP/TLS réels et prévoir l'inspection opérateur après crash/échec de compensation.
- [ ] 5.4 Valider déploiement, rate limiting partagé si multi-instance et accessibilité exhaustive ; ne pas promettre la conservation du cookie pendant 400 jours.