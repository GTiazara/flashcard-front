# Design

## Context

Motivation et périmètre : [proposition](proposal.md). Source fonctionnelle : [spécification manuelle](../../../../spec-manuelle/spec.md). Les répétitions des publics cibles et des sections 4 et 5 sont fusionnées, sans créer de fonctionnalités supplémentaires.

État de livraison revu le 18 octobre 2026 : implémentation frontend/backend terminée, validation locale exécutée et documentée ; qualification d'exploitation et vérifications complémentaires encore réservées. Cette finalisation modifie uniquement OpenSpec. Les preuves et réserves sont consignées dans le [rapport de vérification](verification.md).

| Zone | Éléments observés | Conséquence |
| --- | --- | --- |
| Frontend | [application Vue](../../../src/App.vue), [routes](../../../src/router.ts), [documentation](../../../README.md) | Vue 3/Vite/TypeScript strict/Tailwind, parcours métier, composants communs et gestion de session livrés |
| API | [application Express](../../../../flashcard-back/src/app.ts), [routes](../../../../flashcard-back/src/routes.ts), [documentation](../../../../flashcard-back/README.md) | Réutiliser l'API `/api` et ses conventions, sans réécriture ni fournisseur d'authentification externe |
| Données | [modèles](../../../../flashcard-back/src/models.ts), [transactions et accès](../../../../flashcard-back/src/data.ts) | Les relations, cascades, publications, J'aime, sauvegardes et historiques existent côté backend |
| Authentification | [authentification](../../../../flashcard-back/src/auth.ts), [configuration](../../../../flashcard-back/src/config.ts), [emails](../../../../flashcard-back/src/mail.ts) | Sessions MongoDB, bcrypt, reset et confirmation configurable sont observés dans le code |
| Validation | [tests backend](../../../../flashcard-back/tests/integration.test.ts), [parcours réel](../../../tests/integration/journey.spec.ts), [suites frontend](../../../tests) | Résultats exécutés fournis et corroborés par les README : builds réussis, 23 tests backend, 32 unitaires frontend, 38 Playwright mockés desktop/mobile et 1 scénario réel à deux comptes ; aucune réexécution applicative ici |

Les sept références sous [specs](../../specs) restent le contrat normatif ; leur présence ne prouve pas chaque scénario. Les blocs d'exigences des sept deltas `ADDED Requirements` sont synchronisés avec les références, initialement créées simultanément. Les corrections de routage public et de compteur d'étude précisent la réalisation sans supprimer les exigences de sécurité ni les validations restantes. Un archivage ultérieur devra reconnaître cette synchronisation et ne pas ajouter de doublons ; aucun archivage n'est effectué ici.

## Goals / Non-Goals

**Goals:**
- Décrire le frontend typé livré et ses mécanismes d'accessibilité, sans les confondre avec un audit exhaustif ni déplacer la sécurité dans le navigateur.
- Préserver les garanties transactionnelles et les projections publiques minimales.
- Distinguer explicitement la réalisation livrée, les validations locales acquises et les réserves de qualification.
- Fournir une traçabilité des critères et une validation reproductible avant de cocher les tâches.

**Non-Goals:**
- Réimplémenter une authentification JWT, importer l'authentification de geopinpoint ou partager son secret.
- Ajouter les abonnements, commentaires, duplication indépendante, contenus multimédias, répétition espacée ou mesure de maîtrise.
- Déployer du code, modifier les sources ou l'environnement, installer des dépendances ou archiver le changement dans cette finalisation documentaire.

## Decisions

### Frontend et état applicatif

Le frontend utilise Vue 3.5, Vite 8.3, TypeScript strict 6.0.3, Tailwind CSS 4.3 et Vue Router 5.4, plutôt qu'un framework React ou un rendu serveur non nécessaire au MVP. L'identité/session est un état réactif partagé ; les brouillons et la révision restent locaux aux parcours. TypeScript 6.0.3 est verrouillé pour compatibilité avec vue-tsc 3.3.13 ; Node 24.15+ est recommandé pour les dépendances transitives de test (validation rapportée sous Node 24.13.1).

Les composants communs livrés sont UiButton, UiField, Avatar, EmptyState, LoadState, ConfirmDialog et DeckCard ; les vues composent bibliothèque, cartes, révision et publications. ConfirmDialog utilise le dialogue HTML natif ; les confirmations de sortie utilisent les boîtes natives du navigateur. Aucune bibliothèque Reka/shadcn ni API de police distante n'a été nécessaire. Les icônes utilisent lucide-vue-next, conservé malgré sa dépréciation signalée dans le README.

L'identité livrée utilise un fond `#F8F8FC`, des surfaces blanches, un primaire `#6C5CE7`, des rayons de 20 px et une police système locale. Focus visible, lien d'évitement, erreurs associées aux champs, messages live et mouvements réduits sont présents. Les tests de composants et de navigation clavier ne constituent pas une certification de contraste, de lecteur d'écran ou de toutes les modales ; l'audit exhaustif reste réservé.

La navigation est latérale sur ordinateur et inférieure sous 768 px, avec zone de sécurité ; le fil est centré, la bibliothèque en grille et l'éditeur multi-cartes sur ordinateur. Des états chargement/vide/erreur/validation/non-connecté/succès sont livrés selon le contexte. Le contrôle automatisé de débordement à 360/768/1280 px porte sur le fil en erreur ; les deux projets desktop/mobile couvrent les parcours, sans prouver chaque état de chaque page à toutes les largeurs.

### Routage protégé et lectures publiques livrées

Les routes protégées sont `/library`, `/create`, `/decks/:id/edit`, `/study` et `/study/:id`. La garde attend `/api/auth/me` avant de rendre une page protégée. Une réponse 401 efface l'identité et les vues sensibles ; elle redirige vers la connexion seulement si la route courante est privée. La destination par défaut après connexion est `/feed` ; le retour demandé passe par safeRedirect, qui refuse URL externe, `//`, antislash et caractères de contrôle.

Les routes ouvertes livrées sont `/feed`, `/profile/:username`, `/decks/:id`, `/login`, `/register`, `/forgot-password`, `/reset-password?token=…` et `/verify-email?token=…` ; `/` redirige vers `/feed`. L'aperçu anonyme facultatif de la source est donc réalisé. La page de paquet ouverte ne donne accès qu'au contenu autorisé par l'API : privé réservé au propriétaire, public/non listé lisible par un visiteur. Les mutations sociales, la révision persistée et toute édition exigent une session et les droits serveur. La confirmation d'email exige un clic explicite, pas un POST au chargement.

Alternative rejetée : rendre toutes les lectures API authentifiées pour simuler la protection des pages. L'API existante autorise les lectures du fil, des profils publics et des paquets publics/non listés ; les conserver est cohérent avec le partage. La garde frontend n'est jamais une garantie de confidentialité des données publiques. Les cours privés, modifications et actions sociales restent contrôlés côté serveur.

### Contrat HTTP et gestion des erreurs

Utiliser un client HTTP typé commun avec `credentials: 'include'`, sans conserver de jeton dans localStorage. Toutes les mutations, y compris DELETE et actions sans données, envoient du JSON et `Content-Type: application/json` ; `{}` convient pour publication ou déconnexion. Les identifiants sont `_id`, pas `id`.

Les objets individuels sont directs. Les listes utilisent `{ items, page, hasMore }` ; le profil utilise `{ decks, page, hasMore }` avec ses métadonnées publiques. Pagination initiale : page 1, 12 éléments, limite maximale 100. Les erreurs ont `{ message, errors? }` ; mapper leurs chemins vers les champs. Distinguer notamment 400, 401, 403, 404, 409, 415, 429 et 503. Ne pas vider un formulaire en cas d'erreur. Pour une création dont l'issue réseau est incertaine, vérifier les données serveur avant de proposer une nouvelle création afin d'éviter des doublons involontaires.

Principaux groupes d'API observés :
- Configuration publique : `GET /config`, limité à `{ cardTextMaxLength }`.
- Authentification : `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`.
- Organisation : `/courses`, `/courses/:id/chapters`, `/chapters/:id`, `/decks`, `/decks/:id`, `/decks/:id/cards`, `/cards/:id`, `/decks/:id/cards/order`.
- Communauté : `/decks/:id/publish`, `/feed`, `/publications/:id/like`, `/saved`, `/decks/:id/save`.
- Profils et révision : `/profiles/:username`, `/decks/:id/study-sessions`, `/study-sessions`.

Toutes ces routes sont préfixées par `/api` ; les méthodes et payloads détaillés restent documentés dans le [contrat backend](../../../../flashcard-back/README.md).

### Sessions, mots de passe et emails

Conserver Express TypeScript, `express-session` et `connect-mongo` : sessions dans MongoDB avec expiration TTL, cookie `flashcard.sid`, httpOnly, SameSite=Lax, chemin `/`, sans Domain, Secure en production. Le secret appartient uniquement à cette application, injecté par environnement ; aucun partage de secret, cookie ou collection de sessions avec geopinpoint. Son rôle dans la source est une inspiration d'ergonomie, pas une dépendance technique. L'alternative JWT avec rafraîchissement ajouterait une complexité inutile au besoin observé.

Renouveler l'ID à l'authentification ; la déconnexion détruit la session. Le backend vérifie la version d'authentification en base à chaque requête : le reset incrémente cette version et révoque toutes les anciennes sessions. bcrypt est déjà utilisé via bcryptjs, coût 12 ; mot de passe au moins 12 caractères, au plus 72 octets UTF-8. Email normalisé, unique ; username strict `^[a-z0-9_]{3,24}$`, unique. Le profil est porté par le document utilisateur créé à l'inscription.

Jetons aléatoires 256 bits, empreinte SHA-256 en base, consommation atomique unique, reset 1 h et confirmation 24 h. Une demande de reset remplace l'ancien jeton. La confirmation est pilotée par `REQUIRE_EMAIL_VERIFICATION` et désactivée par défaut. En cas d'échec SMTP de confirmation, l'inscription non confirmée est annulée ; une confirmation réussie ne connecte pas automatiquement.

SMTP reste facultatif hors production. Sans SMTP en développement, afficher explicitement les champs de réponse `devResetUrl` / `devVerificationUrl` dans un panneau réservé au développement ; le backend ne les écrit pas dans les journaux. Avec SMTP, les liens sont envoyés par email et ne sont pas exposés dans les réponses. La configuration actuelle exige SMTP en production même si la confirmation est désactivée, car la récupération du compte reste requise. Le reset répond alors de manière générique, compte connu ou non et échec de livraison compris. Ne jamais journaliser email, jeton, secret ou lien de récupération.

### Données, transactions et invariants

Conserver Mongoose et MongoDB en replica set, local ou Atlas ; le démarrage existant refuse une instance standalone. Les transactions sont nécessaires plutôt que des cascades de requêtes indépendantes, car publication, suppression de dernière carte, J'aime et sauvegarde peuvent être concurrents.

Relations : utilisateur → cours → chapitre ; paquet → propriétaire et chapitre facultatif ; carte → paquet et propriétaire ; publication → paquet unique ; J'aime → utilisateur/publication unique ; enregistrement → utilisateur/paquet unique ; session de révision → utilisateur/paquet. Initialiser les index avant l'écoute HTTP. Les modèles conservent leurs dates ; l'ordre des cartes et chapitres est position puis `_id`.

Les droits sont contrôlés dans l'API et les requêtes ; les validations Mongoose, index uniques et transactions garantissent leurs invariants en base. MongoDB ne fournit ni clés étrangères ni politique de propriété automatique : ne pas prétendre à des règles de sécurité ligne par ligne absentes. Restreindre les accès directs et les identifiants de service à la base. Les mutations liées prennent le verrou d'écriture du paquet et évitent les opérations parallèles dans une même transaction.

Cascades retenues : cours → chapitres → paquets → cartes/publications/J'aime/enregistrements/historique. Un paquet détaché n'est plus concerné par la suppression de son ancien chapitre. Un paquet public doit avoir au moins une carte et une publication unique ; un changement `public` vers `private` ou `unlisted` nettoie les relations sociales. La suppression de la dernière carte publique privatise et dépublie dans la même transaction.

### Visibilité et capacité non listée

`private` est la valeur par défaut ; seul le propriétaire lit et écrit. `public` permet la lecture communautaire et crée une publication si le paquet est non vide. `unlisted` autorise la lecture directe du paquet par son ID, y compris via l'API sans session, mais n'est jamais listé dans le fil, la recherche, les profils publics ou « Enregistrés ». La liste personnelle du propriétaire reste autorisée. Aucun de ces états n'accorde de droit d'édition à un tiers ni ne rend le cours parent public.

Décision MVP : l'ID MongoDB est une capacité de lecture, pas un lien signé, une autorisation nominative ou un secret cryptographique fort. Un transfert du lien transmet l'accès. Ne pas exposer ces IDs dans les listes publiques, l'analytique ou les journaux de navigation ; limiter les fuites de référent et les préchargements. Repasser en privé révoque la lecture tierce ; repasser non listé réutilise l'ID et réactive donc les anciens liens. Une révocation avec rotation de lien et des jetons dédiés serait une évolution hors MVP. La page de lecture publique ne contourne jamais les droits de l'API.

### Découverte, interactions et profils

Reprendre le tri backend : `recent` par date de publication puis `_id` décroissants ; `popular` par total de J'aime, date puis `_id` décroissants, sans période glissante. Recherche littérale insensible à la casse sur titre, description, username et displayName ; filtrage et classement avant pagination. Les filtres matière/niveau restent facultatifs.

Les likes et enregistrements utilisent des PUT exprimant un état booléen souhaité, donc idempotents, avec contraintes uniques en base. Mettre à jour les compteurs après confirmation ou annuler explicitement une mise à jour optimiste échouée. « Enregistrés » référence le paquet d'origine : ni copie, ni permission d'édition, ni droit acquis si la visibilité change.

Le profil est une projection publique explicite, sans email même pour son propriétaire, sans hash ni jeton. Le backend expose actuellement `followerCount: 0` et `followingCount: 0` pour compatibilité ; ne pas afficher ces champs comme une fonctionnalité d'abonnement ni créer de contrôles suivre. Dans le MVP, les paramètres de confidentialité sont la visibilité par paquet et les champs publics facultatifs du profil ; aucun réglage générique ou profil privé n'existe dans le modèle et aucun écran ne doit en simuler un.

### Édition et révision

Rendre les faces comme texte brut par interpolation Vue, pas avec du HTML non assaini. Les modèles actuels fournissent `front` et `back` ; garder cette forme compatible pour le MVP et isoler la présentation afin de permettre plus tard des blocs enrichis, sans les implémenter maintenant.

Les brouillons sont conservés dans localStorage par utilisateur/paquet, sans identifiants d'authentification, avec restauration explicite et confirmation avant abandon. Leurs textes restent lisibles sur un appareil partagé. Les étapes de sauvegarde utilisent plusieurs endpoints : aucune transaction globale d'éditeur ni gestion de conflits multi-onglets. Une création de carte incertaine est réconciliée par relecture ; une création de paquet ambiguë exige de vérifier la bibliothèque avant de réessayer. L'absence de clé d'idempotence interdit une promesse générale d'absence de doublons.

La limite de faces est livrée : `CARD_TEXT_MAX_LENGTH`, entier de 1 à 10000 inclus, défaut 10000, validé au démarrage et capturé par routeur sans mutation globale. POST/PATCH valident chaque face après trim, en unités UTF-16 ; les modèles partagent le plafond fixe 10000, le corps JSON reste à 256 ko. `GET /api/config` expose uniquement `{ cardTextMaxLength }`. Le frontend le charge avant montage et applique cette valeur aux maxlength, compteurs et validations, y compris aux brouillons restaurés. Sur panne ou réponse invalide, repli ergonomique à 10000 : le serveur reste l'autorité et peut refuser une face sous une limite configurée plus basse. Redémarrer le backend puis recharger le frontend après modification. Aucune carte existante n'est tronquée ou migrée ; un PATCH de position seule reste permis. Les autres limites sont titre 160, description 4000, matière/niveau 100, nom d'affichage 80, biographie 1000, URL 2048.

La révision utilise un état local position/face et un ensemble des indices visités : recto à chaque changement, navigation sans rechargement, compteur de **cartes uniques parcourues**, retours sur une même carte sans incrément. Le résumé affiche ce nombre et une durée approximative, sans score ni répétition espacée. Le payload UI borne `cardsVisited` à 100000 et la durée à 1–86400 secondes ; l'API conserve son contrat plus permissif de 1–100000 visites, passages répétés admis. Ce contrat ne redéfinit pas le compteur UI et ne certifie pas l'activité. L'historique personnel ne peuple pas le contenu d'un paquet devenu inaccessible.

La fin de révision déclenche un seul POST, verrouillé pendant l'envoi et après succès ; en cas d'échec le résumé reste en mémoire avec retry explicite. Une réponse perdue peut cacher une session déjà persistée : sans clé d'idempotence, le retry peut dupliquer l'historique ; l'interface avertit de le vérifier. Le résumé ne survit pas à la fermeture de l'onglet.

### Exploitation et validation

Production HTTPS derrière un proxy explicitement déclaré ; origines frontend/API de même site recommandées pour SameSite=Lax. `CORS_ORIGIN` autorise une seule origine exacte avec credentials, les origines hostiles ou `null` sont refusées. Les mutations exigent JSON ; ces protections, SameSite et le contrôle d'origine sont observés, sans inventer de mécanisme de jeton CSRF absent. Un déploiement réellement cross-site exigerait une revue de cookies/CSRF hors de ce choix de déploiement.

Les sessions sont partagées dans MongoDB, mais le rate limiter actuel est en mémoire par processus : prévoir une limitation partagée au proxy ou via store avant exposition multi-instance. Séparer `/api/health` et `/api/ready`, vérifier la connexion et les index, injecter les secrets depuis l'environnement et prévoir sauvegardes et arrêt gracieux. Ne pas embarquer de secrets dans le bundle Vite.

Validation locale exécutée (résultats fournis et README) : compilations TypeScript/production frontend et backend, 23 tests backend Vitest avec MongoMemoryReplSet, 32 unitaires frontend, 38 Playwright mockés desktop/mobile et 1 Playwright réel à deux comptes. Ce dernier utilise Vite/API/MongoDB éphémères sans mocks ni lecture des environnements utilisateur ; il couvre organisation → cartes → révision → publication → recherche → J'aime/enregistrement → profil → dépublication, isolation et retraits. Nettoyage rapporté : ports 3001/5174 libres, aucun mongod restant. Cette finalisation exécute seulement la validation documentaire OpenSpec ; SMTP réel, TLS/préproduction, limite distribuée, audit exhaustif et scénarios non couverts restent des réserves explicites.

### Traçabilité dédoublonnée

| Critères manuels | Capacité de référence | Arbitrage MVP |
| --- | --- | --- |
| Sections 1–3 : créer, apprendre, partager, publics et navigation | [experience](../../specs/experience/spec.md) et capacités métier | Un compte apprenant/créateur ; pages privées authentifiées ; aperçu visiteur facultatif réalisé sur fil, profils et détail autorisé |
| Section 4 répétée : compte, session, reset, confirmation et sécurité | [authentication](../../specs/authentication/spec.md) | Cookies Mongo et bcrypt ; geopinpoint sans partage de secret |
| Sections 4.2 et 10 : identité, édition, confidentialité | [profiles](../../specs/profiles/spec.md) | Email exclu ; pas de compteurs d'abonnements fonctionnels |
| Section 5 répétée : hiérarchie, CRUD, cascades, visibilité | [library](../../specs/library/spec.md) | Paquets autonomes admis ; cascade retenue et confirmée ; ID non listé documenté |
| Section 6 : parcours, faces textuelles, éditeur, validation, ordre, erreurs | [flashcards](../../specs/flashcards/spec.md) | Texte brut livré ; limite 1–10000 via configuration publique ; médias différés |
| Section 7 : carte, navigation, progression, résumé, vide | [study](../../specs/study/spec.md) | Cartes uniques dans le résumé UI, durée approximative et historique ; contrat API permissif distinct ; aucun score |
| Sections 8–9.2 : publication, fil, tris, recherche, J'aime, enregistrements | [community](../../specs/community/spec.md) | Popularité totale/date ; référence plutôt que copie ; filtres facultatifs |
| Sections 9.3–9.4 : abonnements et commentaires | [proposition](proposal.md) | Exclus, y compris leurs listes et compteurs d'interface |
| Sections 11–12 : design, responsive, états, stack | [experience](../../specs/experience/spec.md) et présente conception | Vue 3/Vite/TS/Tailwind et Express/Mongoose livrés ; audit exhaustif et qualification production réservés |

## Risks / Trade-offs

- [Fuite d'un ID non listé ou ID devinable] → Ne pas traiter l'ID comme un secret fort ; exclure les listes publiques, prévenir l'utilisateur du transfert d'accès et proposer le passage en privé. Les copies déjà obtenues ne sont pas révocables.
- [Sessions bloquées par un déploiement cross-site] → Déployer sur des origines de même site, vérifier HTTPS, credentials, CORS et le proxy avant toute ouverture.
- [Base standalone ou cascade interrompue] → Refuser le standalone, exécuter sur replica set/Atlas et vérifier les tests de concurrence/rollback.
- [Confusion entre sécurité en base et règles applicatives] → Documenter l'absence de clés étrangères et empêcher l'accès direct non maîtrisé à MongoDB.
- [Énumération de compte par les liens dev] → Restreindre au développement, supprimer tout affichage dev en production, SMTP requis et absence de secrets dans les logs.
- [Limitation de débit multipliée par le nombre d'instances] → Ajouter une limite partagée avant déploiement multi-instance public.
- [Confusion entre code livré et scénario vérifié] → Cocher seulement les tâches entièrement étayées ; garder les tâches composites partielles ouvertes et consulter le rapport avant tout archivage.
- [Données changées entre lecture et interaction] → Revalider côté serveur, gérer les 404 après dépublication et rafraîchir les listes plutôt que conserver un accès supposé acquis.
- [Métriques de révision déclaratives] → Afficher les cartes uniques parcourues et une durée approximative ; ne pas confondre les visites admises par l'API avec une preuve de maîtrise.
- [Sauvegarde à issue réseau incertaine] → Conserver les saisies et réconcilier les créations ; aucun engagement d'exactement-une-fois sans clé d'idempotence.

## Migration Plan

1. Livré : frontend intégré au backend sans remplacement des sessions ni des identifiants `_id` ; aucune migration de données requise par cette finalisation.
2. Vérifié localement : builds, suites isolées et parcours réel multi-utilisateur ; les cases et réserves détaillent les limites de preuve, sans valider SMTP par déduction.
3. À compléter : bornes et scénarios manquants, audit d'accessibilité, qualification replica set/Atlas et exploitation production ; installer une limitation partagée avant exposition multi-instance.
4. Déployer d'abord en préproduction avec HTTPS et SMTP, puis vérifier disponibilité, protection des pages, absence d'email dans les profils et retrait effectif des publications.
5. Ouvrir progressivement après succès des tests et sauvegarde de la base. En cas de régression frontend, restaurer les actifs précédents et conserver le contrat API compatible ; pour une évolution backend/configuration, restaurer la version compatible et la configuration sans supprimer les index ni les sessions arbitrairement. Toute migration de données ultérieure exige sa propre stratégie de retour.

## Open Questions

Aucune question bloquante de périmètre ou d'architecture ; les versions et la police locale sont fixées. Les vérifications non acquises sont des réserves de livraison, pas des décisions d'implémentation reportées implicitement. Voir [verification.md](verification.md) et [tasks.md](tasks.md).