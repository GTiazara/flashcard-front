# Tasks

État de livraison au 18 octobre 2026. Le frontend et le backend sont implémentés ; les cases indiquent la vérification de **toutes** les clauses de chaque tâche, pas la simple présence du code. Les résultats exécutés fournis et consignés dans les README sont rapprochés des tests inspectés dans [verification.md](verification.md) ; aucune suite applicative n'est relancée dans cette finalisation. Une tâche composite reste ouverte si une borne, une méthode de test ou une exigence manque de preuve. Les réserves ci-dessous ne suppriment aucune exigence. Source : [spécification manuelle](../../../../spec-manuelle/spec.md).

## 1. Foundation

- [x] 1.1 Initialiser le frontend Vue 3/Vite/TypeScript strict/Tailwind avec des versions stables compatibles ; vérifier par compilation de production et vérification TypeScript sans erreur.
- [ ] 1.2 Créer le client `/api` typé avec `_id`, objets directs, listes `{ items, page, hasMore }`, exception profil `{ decks, page, hasMore }`, credentials et JSON sur toutes les mutations ; vérifier ces contrats par tests unitaires avec réponses et erreurs simulées.
- [ ] 1.3 Créer les composants et jetons visuels communs selon la palette et la typographie de la conception ; vérifier les variantes, libellés, focus, contrastes et modales au clavier avec tests de composants, et documenter leur usage.
- [ ] 1.4 Mettre en place les routes et la navigation mobile/ordinateur, attendre la restauration de session avant affichage interne et gérer 401 ; vérifier les accès directs et rechargements de chaque page interne avec tests de routage, puis documenter les routes ouvertes/protégées.

## 2. Authentication

- [ ] 2.1 Vérifier l'inscription existante, email normalisé, unicité DB, username `^[a-z0-9_]{3,24}$`, profil automatique et bcrypt ; compléter les tests aux bornes de username et de mot de passe (12 caractères, 72 octets UTF-8), et documenter les erreurs attendues.
- [ ] 2.2 Construire les formulaires inscription/connexion/déconnexion et la restauration `/auth/me` avec erreurs proches des champs ; vérifier en tests de composants puis parcours navigateur inscription → `/feed` → rechargement → déconnexion.
- [ ] 2.3 Vérifier les sessions Mongo/connect-mongo, renouvellement d'ID, TTL, httpOnly, SameSite et Secure en production ; prouver par tests HTTP l'invalidation de session et l'absence de secrets dans les réponses, puis documenter la configuration des cookies.
- [ ] 2.4 Construire demande et formulaire de reset ; vérifier via tests API et interface le lien d'une heure, usage unique, remplacement de jeton et révocation de toutes les sessions après succès.
- [ ] 2.5 Vérifier SMTP et confirmation optionnelle ; tester confirmation active/inactive, expiration 24 h, absence de session avant confirmation et annulation de l'inscription si livraison impossible ; documenter ces parcours avec les résultats attendus.
- [ ] 2.6 Afficher les liens explicites uniquement en développement sans SMTP et vérifier leur absence en production ; tester message générique pour compte inconnu/échec SMTP et refus de configuration production sans SMTP, puis documenter le panneau dev sans journaliser de liens.
- [x] 2.7 Vérifier contrôle d'origine, exigence JSON, anti-usurpation et rate limiting ; compléter les tests HTTP hostiles, de mass assignment et de limite atteinte, et documenter l'absence de secret partagé avec geopinpoint.

## 3. Library

- [ ] 3.1 Construire liste et formulaires de cours avec titre, description, couleur/icône et dates ; vérifier création, consultation, modification et état vide en tests de composants et avec l'API réelle, puis documenter les champs et limites.
- [ ] 3.2 Construire les chapitres et leur réorganisation par position ; vérifier persistance et tri position/identifiant au rechargement, avec tests de propriété et de rattachement interdit.
- [ ] 3.3 Construire les paquets autonomes ou rattachés, leurs métadonnées et le déplacement/détachement ; vérifier en tests API et interface que seul un chapitre personnel existant est accepté et qu'un paquet détaché conserve ses cartes.
- [x] 3.4 Construire le sélecteur private/unlisted/public avec privé par défaut et avertissement de partage par ID ; vérifier les trois états côté API et les listes sans fuite, puis documenter l'absence de lien signé et la réactivation des anciens liens après retour en non listé.
- [ ] 3.5 Ajouter les confirmations de suppression de cours, chapitre et paquet avec portée explicite ; vérifier annulation, cascade complète et conservation des paquets détachés par tests de composants et d'intégration.
- [ ] 3.6 Vérifier les transactions, contraintes Mongoose, index uniques et permissions de l'existant ; compléter un test de rollback et les cas multi-utilisateur, puis documenter que MongoDB n'assure pas de clés étrangères ni de règles de propriété automatiques.

## 4. Flashcards

- [ ] 4.1 Construire « Nouveau paquet » depuis « Créer », l'éditeur Question/Réponse et toutes ses actions avec compteur ; vérifier création sans cours, ajout, modification, annulation et suppression en tests de composants, puis documenter le parcours.
- [x] 4.2 Centraliser et rendre configurables les limites de faces, en conservant 10000 caractères par défaut et leur cohérence frontend/API/modèles ; vérifier limites, espaces seuls et paramètres modifiés par tests de validation et documenter le mécanisme choisi (`CARD_TEXT_MAX_LENGTH` entier 1–10000, `GET /api/config`, plafond modèle 10000, repli UI soumis au serveur).
- [x] 4.3 Rendre les faces en texte brut et garder un point d'extension de présentation sans médias MVP ; vérifier avec des textes de balisage qu'aucun HTML n'est exécuté, et documenter la limite fonctionnelle.
- [ ] 4.4 Ajouter les contrôles d'ordre persistants et vérifier la permutation exacte sans doublon ni carte étrangère ; couvrir l'ordre après rechargement et l'absence de changement partiel sur erreur avec tests API/interface.
- [ ] 4.5 Conserver les brouillons sur échec réseau et demander confirmation avant abandon volontaire ; vérifier une sauvegarde échouée, une relance et une issue réseau incertaine sans duplication involontaire ni faux message de succès.
- [x] 4.6 Vérifier interdiction d'écriture étrangère et privatisation/dépublication de la dernière carte publique ; exécuter les tests multi-utilisateur et de concurrence publication/suppression avec nettoyage social complet.

## 5. Study

- [x] 5.1 Construire entrée en révision, paquet vide désactivé et erreurs de permission ; vérifier en tests interface/API qu'aucune session vide ou sur paquet privé d'autrui ne démarre et documenter les messages.
- [ ] 5.2 Construire carte centrée, recto/verso, précédente/suivante, bornes et progression ; vérifier navigation sans rechargement, recto à chaque changement et absence de mutation du texte par tests de composants.
- [ ] 5.3 Construire sortie anticipée et résumé de fin avec cartes uniques parcourues et durée approximative ; vérifier retours sur une même carte, sortie prématurée et bornes de persistance sans score de maîtrise, puis documenter la distinction avec les visites répétées admises par l'API.
- [ ] 5.4 Intégrer l'historique personnel paginé existant ; vérifier qu'un paquet devenu privé n'y restitue aucun contenu et qu'un autre utilisateur ne peut pas consulter ces sessions, avec tests d'intégration et d'interface.

## 6. Community

- [x] 6.1 Construire publication/dépublication avec gestion du paquet vide et retrait des listes ; vérifier l'unicité, l'idempotence, l'absence de copie des cartes et le nettoyage transactionnel via tests API/interface, puis documenter les changements de visibilité.
- [ ] 6.2 Construire la publication du fil avec auteur, métadonnées, aperçu, nombre de cartes et actions ; vérifier chaque champ, les états de chargement et la pagination bornée par tests de composants et d'intégration.
- [ ] 6.3 Intégrer les tris récents/populaires et la recherche littérale titre/description/username/nom d'affichage ; vérifier classement global avant pagination, total de likes puis date/ID et absence de privé/non listé, et documenter ce classement sans fenêtre temporelle.
- [ ] 6.4 Intégrer aimer/ne plus aimer avec compteur et gestion d'échec ; vérifier la contrainte unique, les requêtes répétées/concurrentes et l'identité issue de la session, avec tests HTTP et interface.
- [x] 6.5 Construire « Enregistrés » paginé et retrait par référence ; vérifier absence de copie et de droit d'édition, original conservé après retrait et disparition après dépublication, puis documenter ces garanties.
- [x] 6.6 Vérifier les courses entre dépublication, J'aime et sauvegarde et la gestion frontend du 404 après retrait ; exécuter les tests de concurrence existants/complétés et un scénario navigateur de rafraîchissement des listes.

## 7. Profiles

- [ ] 7.1 Construire le profil avec avatar de remplacement, identité, biographie, nombre/liste paginée de paquets publics et état sans publication ; vérifier rendu et pagination avec tests de composants et d'API, puis documenter les champs publics.
- [ ] 7.2 Construire l'édition propriétaire du nom d'affichage, de la biographie et de l'avatar HTTP(S), sans édition du username ; vérifier succès, effacement des champs facultatifs, URL invalide et refus d'un autre utilisateur en tests API/interface.
- [x] 7.3 Vérifier les projections de profil, y compris après PATCH et pour le propriétaire ; prouver par tests JSON et rendu l'absence d'email, secrets, cours privés, non listés et historique, et documenter les paramètres de confidentialité réellement disponibles.
- [ ] 7.4 Ne pas afficher les compteurs d'abonnements à zéro du backend comme fonctionnalité et ne pas créer suivre/commenter ; vérifier leur absence dans le profil et le fil par tests de composants et revue du périmètre MVP.

## 8. Experience and Operations

- [ ] 8.1 Vérifier les états chargement, vide, réseau, validation, non-connecté, sans résultat et succès sur chaque parcours ; livrer une matrice de cas avec tests de composants et messages français sans page blanche.
- [ ] 8.2 Vérifier smartphone/tablette/ordinateur, navigation basse et zones de sécurité, grille et éditeur large ; effectuer des tests navigateur à 360, 768 et 1280 px sans débordement ni action cachée et consigner les résultats.
- [ ] 8.3 Vérifier clavier, focus, modales, libellés, contrastes et cibles tactiles ; livrer un audit d'accessibilité des parcours critiques avec corrections et tests automatisés lorsque possible.
- [ ] 8.4 Vérifier démarrage replica set/Atlas, refus standalone, initialisation des index, health/ready et arrêt gracieux ; compléter les tests d'exploitation et la documentation de déploiement sans secrets.
- [ ] 8.5 Vérifier HTTPS, proxy de confiance, origine exacte, credentials, cookie SameSite et absence de secrets dans le bundle ; livrer une validation préproduction et un guide de configuration de même site avec SMTP production requis.
- [ ] 8.6 Mettre en place ou confirmer une limitation partagée avant exposition multi-instance ; vérifier le comportement sur deux instances et documenter que le limiteur actuel est en mémoire par processus.

## 9. End-to-End Acceptance

- [x] 9.1 Exécuter un parcours Playwright à deux comptes : inscription → cours/chapitres → cartes → révision → publication → recherche → J'aime/enregistrement → profil → dépublication ; conserver le rapport démontrant l'isolation et les retraits attendus.
- [x] 9.2 Exécuter compilation/vérification TypeScript, suites frontend et backend sur une base de test isolée ; consigner les commandes, versions et résultats sans déduire un succès de la seule présence des tests.
- [x] 9.3 Relire la matrice de traçabilité du design contre chaque scénario et relever toute divergence ; vérifier la cohérence exacte référence/delta, valider OpenSpec strictement et produire une liste explicite des réserves restantes avant toute case cochée sans preuve.

## Réserves de livraison

Les clauses non démontrées restent exigibles ; une case ouverte n'implique pas que toute la fonctionnalité manque. La correspondance des preuves est détaillée dans [verification.md](verification.md).

- **1.2–1.4** : client et navigation livrés, tests unitaires du transport et tests navigateur de listes/profils disponibles ; pas de tests unitaires explicites de tous les formats de listes, ni de rechargement de chaque route privée, ni de tests de composants exhaustifs variantes/contrastes/focus/modales.
- **2.1–2.3** : inscription/connexion/logout réels, validations et sessions Mongo vérifiées ; bornes username 2/3/24/25 et bornes exactes mot de passe côté HTTP non exhaustives (12 caractères et 72 octets testés côté helper UI), renouvellement comparé d'ID, expiration TTL effective et cookie Secure derrière TLS non démontrés. Le parcours complet inscription → reload → logout n'est pas couvert en un test navigateur, ni les formulaires par tests de composants dédiés.
- **2.4–2.6** : reset, empreinte, usage unique, refus d'expiration forcée, révocation des sessions, confirmation active/inactive et panneau dev couverts partiellement ; remplacement d'un ancien jeton, durées exactes 1 h/24 h, expiration confirmation, annulation sur échec SMTP, réponse générique SMTP et absence des liens dans un build production non testés de bout en bout. SMTP réel et recette préproduction non livrés.
- **3.1–3.3, 3.5** : CRUD, ordre, rattachement, détachement, cascades et isolation API couverts ; tests de composants demandés, tous champs/métadonnées et bornes, tri à position égale après reload, déplacement/détachement UI et confirmations/annulations de chaque type de suppression non exhaustifs. La conservation des cartes lors d'un détachement n'est pas explicitement prouvée avec un paquet détaché non vide.
- **3.6** : transactions et index présents, cascades et courses testées ; aucun test injectant une panne au milieu d'une cascade pour prouver le rollback. Ne pas confondre rejet avant écriture et rollback transactionnel forcé.
- **4.1, 4.4–4.5** : éditeur, ordre et brouillons livrés ; modification/annulation/suppression de carte par tests de composants non exhaustives, permutation invalide non suivie d'une assertion explicite d'ordre inchangé. Panne et restauration testées, mais pas de scénario complet de retry/réconciliation après réponse perdue. Sauvegarde multi-endpoints non atomique, sans clé d'idempotence : ne pas garantir zéro doublon.
- **5.2–5.4** : helpers et navigateur prouvent recto, bornes, cartes uniques et sortie anticipée ; pas de tests de composants dédiés, ni toutes les bornes HTTP exactes de persistance (notamment durée zéro, visites 100000 acceptées). Historique privé vérifié côté API, pas le scénario UI paginé après privatisation. Retry de session après réponse perdue peut dupliquer sans clé d'idempotence.
- **6.2–6.4** : fil, pagination, recherche et likes livrés ; pas d'assertion exhaustive de chaque métadonnée/chargement par composant, ni d'égalité forcée date/ID et de recherche displayName isolée, ni de panne UI ciblée du like avec vérification du compteur inchangé. Classement global et courses restent étayés par les tests backend.
- **7.1–7.2, 7.4** : profils publics/propriétaires, pagination API, avatar de remplacement et absence de suivre testés ; pas de pagination profil UI ni de tests de composants de tous les états, d'effacement bio/avatar avec rechargement et de non-édition username explicitement couverts. L'absence suivre/commenter est revue dans le périmètre, pas couverte exhaustivement par composant fil/profil.
- **8.1–8.3** : matrice de preuves par famille dans le rapport, mais pas de matrice exhaustive de tous états par page. Chromium desktop/mobile et contrôle du fil à 360/768/1280 px ne certifient pas toutes les vues ni Firefox/WebKit. Audit accessibilité exhaustif (lecteur d'écran, contrastes, cibles, focus et modales) non livré.
- **8.4–8.5** : replica set éphémère, index, health/ready et teardown QA vérifiés ; refus standalone et arrêt gracieux du serveur de production ne disposent pas d'un test dédié. Atlas, sauvegarde/restauration, TLS/proxy/cookie Secure, SMTP réel et contrôle du bundle en préproduction non qualifiés. Le teardown QA ne prouve pas à lui seul SIGTERM en production.
- **8.6** : limiteur distribué et test sur deux instances non livrés ; le limiteur existant est en mémoire par processus. Sessions Mongo partagées ≠ limitation de débit partagée.

Les anciennes mentions « tâches non cochées » des README décrivent la livraison frontend initiale, pas cette revue consolidée ; les README restent inchangés hors du périmètre autorisé.

## Workflow follow-up

- Les blocs d'exigences référence/delta sont synchronisés dans cette finalisation ; lors d'un archivage ultérieur, ne pas ajouter une seconde fois les exigences créées simultanément.
- Aucun archivage automatique : lever ou accepter explicitement les réserves avant toute décision d'archivage. Les sources et les environnements ne font pas partie de cette livraison documentaire.