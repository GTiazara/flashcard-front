# Vérification de livraison — 18 octobre 2026

## Périmètre et niveau de preuve

Finalisation **OpenSpec uniquement**, sans modification des sources, tests, dépendances ou environnements et sans archivage. Implémentation frontend/backend livrée ; qualification production et certaines clauses de vérification encore ouvertes.

Les résultats applicatifs ci-dessous sont les **exécutions déjà réalisées**, fournies pour cette livraison et corroborées par les sections récentes des [README frontend](../../../README.md) et [backend](../../../../flashcard-back/README.md). Les tests et configurations ont été inspectés pour établir leur portée ; leur seule présence n'est pas traitée comme une exécution réussie. Aucune suite applicative n'a été relancée pendant cette finalisation. Les anciens chiffres 20/22/36 et la mention de cases non cochées des README concernent les validations antérieures ; les chiffres consolidés sont 23/32/38/1.

## Résultats exécutés et reproductibilité

| Projet / commande dans son dossier | Résultat fourni et documenté | Portée |
| --- | --- | --- |
| Backend — `npm run build` | Réussi | TypeScript et production |
| Frontend — `npm run build` | Réussi | vue-tsc strict et Vite |
| Backend — `npm test` | **23 réussis** | Vitest/Supertest, MongoMemoryReplSet isolé ; intégration HTTP/DB et validations de configuration |
| Frontend — `npm test` | **32 réussis** | Transport, erreurs/401, redirections, UTF-8, composants, révision et configuration publique |
| Frontend — `npm run test:e2e` | **38 réussis** | 19 scénarios × Chromium ordinateur/mobile, **API simulée** |
| Frontend — `npm run test:integration` | **1 réussi** | Deux comptes, vrai navigateur/API/MongoDB temporaire, sans interception HTTP |

Versions : Node 24.13.1 rapporté, 24.15+ recommandé ; Vue 3.5.44, Vite 8.3.4, TypeScript frontend 6.0.3 / backend contrainte ^5.9.3, vue-tsc 3.3.13, Tailwind 4.3.3, Vue Router 5.4.0, Vitest 5.0.5, Playwright 1.64.1. Voir les [manifestes frontend](../../../package.json) et [backend](../../../../flashcard-back/package.json) ; une contrainte backend n'est pas présentée comme une version résolue certifiée.

Le [parcours réel](../../../tests/integration/journey.spec.ts) couvre inscription A/B et restauration, cours/chapitre/paquet privé, deux cartes et ordre, révision persistée une seule fois, publication, recherche, like/save persistés, bibliothèque enregistrée, profil public sans secrets, interdictions croisées et anonymes, puis dépublication et disparition du fil/sauvegardes/profil, 404 sur ancien lien et interactions. Les cookies des contextes indépendants servent aux contrôles HTTP. Le [dernier état d'intégration](../../../test-results/integration/.last-run.json) indique `passed`, sans échec ; ce fichier local ignoré n'est pas une preuve versionnée indépendante.

Isolation : [configuration Playwright réelle](../../../playwright.integration.config.ts), [serveur QA](../../../../flashcard-back/tests/e2e-server.ts) et [teardown](../../../tests/integration/teardown.ts). Base replica set éphémère, aucune DB utilisateur/Atlas, aucun environnement utilisateur lu/modifié. Nettoyage confirmé dans les résultats fournis et les README : ports **3001/5174 libres**, aucun mongod restant. Le teardown QA Windows n'équivaut pas à un test d'arrêt gracieux du serveur de production.

## Traçabilité et matrice des scénarios

**Étayé** : assertions pertinentes et résultat de suite disponible. **Partiel** : réalisation présente mais toutes les clauses du scénario ou la méthode de test demandée ne sont pas démontrées. Les [réserves par tâche](tasks.md) conservent les vérifications manquantes ; la matrice ne déclare pas chaque exigence intégralement acquise.

| Capacité / scénarios relus | Preuves inspectées | État et limites |
| --- | --- | --- |
| Authentication — inscription valide, données invalides, connexion/restauration, refus/logout, usurpation/origine, mot de passe, reset réussi/invalide/remplacé, liens dev/production, confirmation/échec SMTP | [Backend](../../../../flashcard-back/tests/integration.test.ts), [auth UI](../../../tests/e2e/auth.spec.ts), [navigation/auth](../../../tests/e2e/app.spec.ts), [unitaires API](../../../tests/unit/api.test.ts), parcours réel | Parcours usuels, JSON/origines/429, unicité, usage unique et révocation étayés ; bornes HTTP, rotation/TTL/Secure, remplacement du reset, expiration confirmation et SMTP partiels/non qualifiés (2.1–2.6). |
| Library — cours personnel, isolation, réorganisation/rattachement interdit, création autonome/rattachement, détachement/invalide, lecture privée/non listée, publication sans propagation, annulation/cascade, échec de cascade, mutation étrangère | Backend, [éditeur/bibliothèque](../../../tests/e2e/editor-library.spec.ts), parcours réel | CRUD/permissions, trois visibilités, rattachement API et cascades étayés ; égalités de position/reload, détachement non vide, confirmations de chaque type et panne injectée pendant cascade restent partiels (3.1–3.3, 3.5–3.6). |
| Flashcards — création autonome, texte brut, face invalide, modification/annulation, limite serveur invalide/dépassée, config réduite/brouillon, config indisponible, ordre valide/invalide, écriture étrangère, dernière carte publique, échec réseau | Backend, éditeur/bibliothèque, [configuration unitaire](../../../tests/unit/config.test.ts), parcours réel | Limites, rendu brut, protection étrangère, dernière carte et concurrence étayés ; modification/annulation/suppression UI, ordre inchangé après erreur et réponse perdue/réconciliation restent partiels (4.1, 4.4–4.5). |
| Study — paquet vide/privé, retournement, navigation, sortie anticipée, fin, retours uniques, client déclarant des visites répétées, historique après visibilité | Backend, navigation/auth, [révision unitaire](../../../tests/unit/review.test.ts), parcours réel | Démarrage autorisé, recto/navigation, uniques, API acceptant trois visites sur un paquet d'une carte et durée bornée étayés ; tests de composants demandés, toutes bornes HTTP et historique UI après privatisation restent partiels (5.2–5.4). |
| Community — publication valide/vide, retrait concurrent, lecture/pagination, invitation anonyme à se connecter, popularité globale, recherche littérale, like répété/retrait, save/retrait, paquet enregistré retiré | Backend, navigation/auth, parcours réel | Publication et retraits étayés, référence sans copie et isolation vérifiées ; toutes métadonnées/états du fil, égalités date/ID, displayName isolé et échec UI du like non exhaustifs (6.2–6.4). |
| Profiles — publications, profil vide, mise à jour, modification étrangère, JSON/rendu, réduction des informations | Backend, navigation/auth, éditeur/bibliothèque, [composants](../../../tests/unit/components.test.ts), parcours réel | Projection minimale et droits étayés ; pagination UI, tous états par composant et effacement/rechargement des champs facultatifs non exhaustifs (7.1–7.2, 7.4). |
| Experience — connexion/navigation, accès direct privé, lecture publique/action authentifiée, destination externe/ambiguë, responsive, hiérarchie visuelle, clavier, états vides/réseau/retry, stockage indisponible/incompatible | Suites frontend/backend, [routeur](../../../src/router.ts), [Playwright mocké](../../../playwright.config.ts), README | Routes, helper de retour sûr et états représentatifs étayés, largeur du fil vérifiée à 360/768/1280 ; pas de tous états sur chaque page/largeur, audit exhaustif, démarrage standalone testé ou qualification production (1.3–1.4, 8.1–8.6). |

Les **14 tâches cochées sur 46** sont reliées aux preuves ci-dessus : 1.1 (build), 2.7 (sécurité HTTP), 3.4 (visibilité), 4.2 (configuration), 4.3 (texte brut), 4.6 (permissions/concurrence), 5.1 (démarrage), 6.1 (publication), 6.5 (références), 6.6 (courses/404/retraits), 7.3 (projections), 9.1 (parcours réel), 9.2 (résultats consolidés), 9.3 (revue et validation documentaire). Les **32 tâches composites ouvertes** gardent leurs clauses non démontrées ; ce décompte ne mesure pas le pourcentage de code réalisé.

## Alignements documentaires

- **Étude** : le résumé UI compte les **cartes uniques parcourues**, pas les allers-retours ; `cardsVisited` API conserve l'acceptation des visites répétées. Ni compteur ni durée approximative ne prouvent une maîtrise.
- **Routes sûres** : fil, profils et détail autorisé sont ouverts ; bibliothèque, création/édition et révision sont protégées. Aucune route ouverte n'accorde la lecture privée ni l'écriture anonyme ; safeRedirect refuse les retours externes/ambigus.
- **Faces** : `CARD_TEXT_MAX_LENGTH` entier **1–10000**, défaut **10000**, trim/UTF-16, plafond modèle 10000 ; `GET /api/config` expose seulement `cardTextMaxLength`. UI chargée avant montage, maxlength/compteurs/brouillons alignés ; repli à 10000 sur panne, serveur toujours autoritaire, aucune troncature.
- Les sept blocs normatifs référence/delta restent identiques hors en-têtes. Les deltas initiaux `ADDED` sont conservés : ne pas les réappliquer en doublon aux références déjà présentes. Les exigences de rollback, sécurité et accessibilité ne sont pas abaissées pour masquer une réserve.

## Réserves et décision

1. **Accessibilité** : mécanismes et tests ciblés livrés, audit exhaustif lecteur d'écran/contrastes/focus/modales/cibles non livré ; Chromium uniquement et responsive non exhaustif.
2. **Préproduction** : TLS réel, proxy/cookie Secure, SMTP réel (livraison et panne), Atlas, exploitation et sauvegarde/restauration non qualifiés. Les tests de configuration ne prouvent pas ces déploiements.
3. **Multi-instance** : rate limiter **en mémoire par processus**, limitation distribuée et test à deux instances **non livrés**. Ne pas exposer plusieurs instances sans protection partagée.
4. **Tests manquants** : bornes username/mot de passe HTTP et persistance étude, durées/rotation de jetons, TTL, rollback forcé, égalités de tri, tous états/champs/composants, effets d'une réponse réseau perdue ; détail exhaustif des clauses identifiées dans la section Réserves de [tasks.md](tasks.md).
5. **Protocole** : éditeur multi-endpoints non atomique, pas de clé d'idempotence ni de conflits multi-onglets ; un retry de session après réponse perdue peut dupliquer l'historique. Brouillons locaux lisibles sur appareil partagé, résumé perdu à la fermeture.

**Décision : livraison locale documentée avec réserves ; pas d'archivage automatique, pas de certification de production.**

## Validation documentaire de cette finalisation

- CLI existant repéré par `Get-Command openspec` : aucune installation npm ni régénération des workflows.
- `openspec validate --all --strict --no-interactive` : **8 éléments valides, 0 échec** (7 références + 1 changement). Les blocs dépassant la longueur admise ont été scindés sans supprimer leurs garanties/scénarios ; aucun avertissement final.
- Comparaison exacte des blocs `Requirements` / `ADDED Requirements`, après normalisation CRLF/LF : **7 paires identiques**.
- Contrôle SHA-256 avant/après : **80 fichiers hors OpenSpec inchangés**, dont sources/tests frontend et backend, README, manifestes/configurations, environnements et spécification manuelle. Les empreintes ne révèlent aucun contenu sensible.
- Changement conservé actif avec réserves ; pas de commande d'archivage exécutée.