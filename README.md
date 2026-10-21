# Mnemo — frontend

Application française Vue 3, Vite, TypeScript strict, Tailwind CSS v4 (plugin Vite), Vue Router et lucide-vue-next. Aucune API de police, aucun service tiers obligatoire, aucun jeu de démonstration en production. Les dossiers existants `.git`, `.github` et `openspec` sont conservés.

## Déployer sur GitHub Pages

Le workflow [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) déploie sur chaque push de `main` et sur déclenchement manuel depuis Actions.

1. GitHub **Settings → Pages → Source : GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables** : créer `VITE_API_BASE_URL` avec l'URL réelle du backend HTTPS terminée par `/api`. Aucun identifiant ou secret dans cette URL publique. Le workflow refuse une valeur absente ou fictive.
3. Relancer **Deploy frontend to GitHub Pages** depuis Actions après configuration.

Le workflow lit la configuration officielle Pages avec `actions/configure-pages` : préfixe `/flashcard-front/` sur **https://gtiazara.github.io/flashcard-front/**, ou `/` sur le domaine personnalisé **https://flashcard.skippylab.com/**. Il configure aussi le routage hash (`#/feed`, `#/library`) pour éviter les 404 au rechargement. Le développement local garde ses routes habituelles. Configurer le domaine dans Settings → Pages, puis relancer le workflow pour reconstruire les chemins des actifs ; aucun changement manuel du préfixe n'est nécessaire.

**Cookies et backend :** Pages ne fait tourner ni Node.js ni MongoDB. Le frontend `gtiazara.github.io` et une API sur un autre domaine sont cross-site ; les cookies `SameSite=Lax` actuels ne permettent pas des sessions fiables dans ce cas. Recommandation : domaine personnalisé `app.mondomaine.fr` sur Pages et API `api.mondomaine.fr`, tous deux en HTTPS ; ou déployer frontend et `/api` sur la même origine. Côté backend, `CORS_ORIGIN` doit être l'origine exacte du frontend, sans chemin. Ne pas désactiver les protections CORS/CSRF pour contourner ce problème.

**Liens email :** le backend génère actuellement des liens sans hash depuis une origine `FRONTEND_URL` stricte. Le reset et la confirmation email sur Pages nécessitent une adaptation backend aux URLs avec préfixe et hash avant utilisation en production. Ne pas mettre un chemin dans la configuration backend actuelle, qui le refuserait.

Les fichiers d'environnement locaux ne sont pas publiés ; GitHub Actions fournit les valeurs publiques au build. Modifier une variable nécessite de relancer le workflow.

## Démarrer

Depuis ce dossier : installer avec `npm install`, puis démarrer avec `npm run dev`. URL canonique : **http://localhost:5173**. Vite conserve son écoute sur **127.0.0.1**, avec `port: 5173` et `strictPort: true` : si le port est occupé, il échoue au lieu de basculer silencieusement sur 5174, qui serait refusé par le backend. Arrêter l’instance en double depuis son terminal ; aucun processus existant n’est arrêté automatiquement. Les options explicites `--port` des suites E2E restent prioritaires.

Avec `NODE_ENV=development` côté backend et une `CORS_ORIGIN` loopback (par défaut `http://localhost:5173`), les origines `localhost`, `127.0.0.1` et `[::1]` sont équivalentes **uniquement à protocole et port identiques**. Cela autorise aussi **http://127.0.0.1:5173**, sans ouvrir les autres IP ou ports. En `test` et `production`, seule l’origine configurée exacte est acceptée. Conserver une URL de navigateur stable : les cookies restent propres à chaque hôte, sans transfert de session entre localhost et 127.0.0.1. Le proxy ne réécrit pas `Origin`.

Le backend doit être lancé séparément sur **http://localhost:3000**, avec sa configuration MongoDB et son secret de session. Replica set/Atlas recommandé pour les transactions ; standalone accepté en mode dégradé mono-processus sans rollback, avec risque d’écritures partielles. Voir son contrat dans le dossier voisin. Le proxy Vite transmet `/api` vers ce backend ; `API_PROXY_TARGET` permet de changer la cible côté serveur uniquement (jamais de secret `VITE_*`). Les suites unitaires et E2E mockées ne démarrent pas de backend ; la suite d’intégration isolée ci-dessous démarre sa propre base éphémère. Pour un `/feed` non vide en développement, lancer `npm run seed:mnemo` côté backend : il crée le compte `mnemo` et des paquets publics de culture générale (voir le README backend).

Copier éventuellement `.env.example` vers `.env.local`. `VITE_API_BASE_URL=/api` est la valeur par défaut. Ne jamais placer un secret dans une variable `VITE_*` : elle est publique dans le navigateur.

### Versions

Versions stables verrouillées dans le manifeste et le lockfile : Vue 3.5, Vite 8.3, Tailwind 4.3, Vue Router 5.4, Vitest 5, Playwright 1.64. TypeScript **6.0.3** est volontairement utilisé : TypeScript 7.0.2, stable lors de l’installation, casse actuellement `vue-tsc` 3.3.13 (`typescript/lib/tsc` non exporté). jsdom 29.1.1 conserve la compatibilité avec le Node installé (24.13.1), contrairement à jsdom 30. Node **24.15+ recommandé** pour éviter les avertissements de moteurs de dépendances transitives de test. lucide-vue-next est conservé conformément à la stack demandée, bien que npm recommande désormais @lucide/vue.

## Parcours livrés

| Route | Accès / fonction |
| --- | --- |
| `/feed` | Public, recherche temporisée 350 ms, tris récents/populaires, pagination, aperçu animé recto-verso (texte et image), likes et enregistrements après confirmation serveur |
| `/library` | Connecté, cours/chapitres CRUD, positions et ordre, cascades confirmées, paquets filtrés, enregistrés |
| `/create` | Connecté, création rapide d’une flashcard, puis paquet autonome ou rattaché à un chapitre personnel |
| `/decks/:id` | Selon visibilité API, aperçu animé des cartes, partage, publication et suppression propriétaire |
| `/decks/:id/edit` | Connecté et propriétaire vérifié, métadonnées, cartes texte et image, ordre PUT, brouillons |
| `/study` | Connecté, paquets personnels/enregistrés et historique personnel paginé |
| `/study/:id` | Connecté, démarrage explicite si non vide, retournement animé, clavier, sortie confirmée, résumé et sauvegarde |
| `/profile/:username` | Public, identité/bio/paquets publics paginés ; édition réservée au propriétaire |
| `/login`, `/register` | Connexion/inscription, restauration initiale `/auth/me`, erreurs proches des champs, état confirmation requise |
| `/forgot-password`, `/reset-password?token=…` | Demande générique, lien de développement seulement s’il est explicitement fourni, changement de mot de passe |
| `/verify-email?token=…` | Confirmation **manuelle**, aucun POST au chargement |

Les redirections après connexion sont limitées à des chemins internes, sans `//`, antislash ou caractères de contrôle. Les lectures publiques restent publiques ; la garde frontend ne remplace pas l’autorisation de l’API.

Sur `/create`, le bandeau **Créer une flashcard** est l’action principale. Il ouvre une fenêtre centrée sur la question et la réponse, avec images HTTP(S) facultatives et choix d’un paquet existant. Sans destination choisie, `POST /api/cards/quick` range la carte dans le paquet privé « Général », créé automatiquement une seule fois pour ce compte. `Ctrl`/`Cmd` + `Entrée` enregistre la carte. Le formulaire complet du paquet reste disponible juste en dessous. Il n’y a pas de bouton flottant sur les autres pages.

## Profils temporaires automatiques

À l’ouverture, une promesse partagée charge `GET /api/auth/me`. Seulement si la session est absente (401), elle appelle une seule fois `POST /api/auth/guest {}`. La réponse est directement la projection publique de l’utilisateur, avec `isGuest`. Les anciennes projections sans ce champ sont traitées comme permanentes. Aucun utilisateur fictif n’est créé côté navigateur : une panne affiche une erreur et une reprise explicite.

Un profil temporaire est authentifié : bibliothèque, cours, chapitres, cartes, révisions, édition du profil, likes, enregistrements et publications sont accessibles avec les mêmes contrôles propriétaire que pour un compte permanent. Dans le tableau précédent, « Connecté » inclut donc les invités. Le badge **Profil temporaire**, le nom affiché et **Conserver mon profil** identifient cet état, y compris sur mobile.

- Le serveur conserve l’accès invité grâce à un cookie opaque **httpOnly de 400 jours** ; si la session manque, l’endpoint invité restaure le même utilisateur et une session. **Pas de remise à zéro quotidienne.** La durée du cookie ne garantit pas une conservation éternelle : suppression des cookies, autre navigateur, politique du navigateur ou sortie explicite peuvent empêcher de retrouver le profil.
- Avant conversion, aucun email n’est associé : **pas de récupération par email** pour ce profil temporaire. Conserver le profil via `/register` demande un pseudo et un mot de passe (12 caractères minimum, 72 octets UTF-8 maximum), conserve le même `_id`, le nom affiché déjà choisi et tout son contenu. Le lien de récupération s’affiche une seule fois, juste après la création, et doit être enregistré par l’utilisateur. Le profil peut en générer un nouveau, qui remplace l’ancien. La suppression du compte efface aussi ses contenus. Les comptes déjà créés avec un email continuent de se connecter et de réinitialiser leur mot de passe avec cette adresse. Les brouillons locaux restent liés à cet identifiant.
- Si l’inscription nécessite une vérification, l’identité locale est effacée et un simple booléen `mnemo:verification-pending` est conservé en **sessionStorage**, sans email, mot de passe ou token. Dans cet onglet, aucun nouveau profil invité ni nouvelle conversion ne sont lancés automatiquement ; après rechargement, l’inscription reste en attente. Confirmer l’email puis se connecter. L’initialisation des pages de vérification et récupération de mot de passe ne crée pas d’invité.
- La page de connexion propose **Continuer sans compte**. Y naviguer ne quitte pas le profil temporaire. **Se connecter à un compte existant ne transfère ni ne fusionne le contenu invité** : avertissement avant soumission ; le serveur efface alors le cookie invité.
- **Quitter ce profil** termine la session et efface le cookie invité côté serveur. Pour un invité, une confirmation avertit de la perte possible d’accès ; annuler ne modifie rien. Après une sortie réussie, aucun invité n’est recréé silencieusement : choisir **Recommencer en invité**, ou recharger la page. Un échec de sortie conserve le profil affiché et l’erreur.
- Un 401 métier efface les vues sensibles et l’identité, sans boucle de redirection login/route privée et **sans POST invité automatique**. La reprise est explicite via **Réessayer en invité** ; le serveur peut restaurer le même profil si son cookie est encore valide. Les réponses tardives d’une ancienne identité sont ignorées ; une nouvelle identité remonte les vues privées et utilise son propre espace de brouillons.

Validation profils temporaires du 18 octobre 2026 : **build strict réussi, 46 tests unitaires, 46 E2E mockés desktop/mobile et 2 E2E réels MongoDB éphémère réussis**. Les suites couvrent initialisation concurrente, pannes, 401, sortie et vérification. Le parcours réel vérifie notamment la restauration après suppression du seul cookie de session, la durée et le caractère httpOnly du cookie durable, la conversion au même `_id`, le contenu conservé et l’isolation après sortie. Nettoyage confirmé : ports 3001/5174/5175 libres, aucun processus mongod restant. Aucun changement backend, OpenSpec, racine ou fichier d’environnement.

## Contrat et sécurité

- Identifiants `_id`, objets directs, listes `{items,page,hasMore}` ; profil `{decks,page,hasMore}`.
- `credentials: include` et JSON pour toutes les mutations, y compris DELETE, logout et publish (`{}`).
- Une réponse 401 métier efface l’identité et les vues sensibles et demande une reprise explicite ; les refus sur les endpoints de connexion/initialisation n’invalident pas un autre profil actif. Aucun token/session n’est stocké dans localStorage.
- Textes rendus par interpolation Vue, sans `v-html`. Avatar HTTP(S), initiales de remplacement et absence de référent pour les images externes.
- Mots de passe : 12 caractères minimum, 72 octets UTF-8 maximum, username `^[a-z0-9_]{3,24}$`.
- Les liens de développement retournés par l’API ne sont montrés qu’avec `import.meta.env.DEV`. Aucun token, email ou lien de récupération n’est journalisé ou persisté.
- Les bibliothèques n’accordent pas de droit d’édition aux paquets enregistrés. L’éditeur vérifie le propriétaire avant d’afficher les champs.
- Les identifiants non listés sont des capacités de lecture, pas des liens signés. Tout détenteur peut transmettre le lien. Retour en privé = retrait d’accès ; retour en non listé = réactivation des anciens liens.

## Éditeur et conservation des données

Au démarrage, le frontend charge la configuration publique via `GET /api/config` avant de monter l’application. Seul `cardTextMaxLength` (entier 1–10000) est utilisé : `maxlength` du texte recto/verso, compteurs et validation centralisée avant toute sauvegarde, y compris pour les brouillons restaurés. Chaque face peut aussi porter une image facultative, adresse HTTP(S) d’au plus 2048 caractères : texte seul, image seule, ou les deux. Une face sans texte ni image est refusée. La limite est définie côté backend par `CARD_TEXT_MAX_LENGTH`, défaut **10000**, configurable uniquement vers le bas ; aucune variable `VITE_*` supplémentaire ni secret à transmettre. Recharger la page après un changement backend. En cas de panne HTTP/réseau ou de réponse invalide, repli à 10000 : **le serveur valide toujours réellement**, et peut refuser une face dépassant sa limite plus basse. Les longueurs sont comptées en unités UTF-16 après trim pour la validation ; aucun texte existant n’est tronqué automatiquement.

Validation de cet ajout le 18 octobre 2026 : builds frontend/backend réussis, **32 tests unitaires frontend** (chargement, réponses invalides, pannes et validation dynamique), **23 tests backend**, **38 E2E mockés** desktop/mobile (dont brouillon trop long sans mutation) et **1 E2E réel** frontend/API/MongoDB réussis. Nettoyage confirmé : ports 3001/5174 libres, aucun processus mongod restant. Les résultats plus bas décrivent les validations antérieures.

Brouillon temporisé 500 ms dans localStorage, clé `mnemo:draft:<userId>:<deckId|new>`, avec uniquement les métadonnées/cartes et les identifiants de suivi de sauvegarde. Aucun mot de passe, email ou token. Proposition explicite de restauration. Une erreur conserve le formulaire. La sortie est protégée par garde de route et `beforeunload` ; Annuler abandonne le brouillon et revient aux données serveur. Sur un appareil partagé, les textes de cartes du brouillon restent lisibles dans le stockage local du navigateur : ne pas y écrire de secrets, ou supprimer le brouillon après usage.

Les étapes d’une sauvegarde d’éditeur utilisent les routes API séparées. Il ne s’agit donc **pas d’une transaction globale de l’éditeur** : en cas d’échec, certaines cartes peuvent déjà être enregistrées. Les identifiants confirmés sont conservés. Une création de carte à issue réseau incertaine est réconciliée par relecture avant nouvel essai. Une création de paquet incertaine ne doit pas être renvoyée aveuglément ; vérifier la bibliothèque si la correspondance est ambiguë. Il n’existe pas de clé d’idempotence backend ni de gestion de conflits multi-onglets/versionnement ; ne pas éditer le même paquet simultanément dans plusieurs onglets.

Le rattachement se fait à un **chapitre**, pas directement à un cours. Sélectionner un cours sans chapitre laisse le paquet autonome. Pour les filtres cours/chapitre et les sélecteurs, les pages API sont parcourues intégralement puis affichées par tranches de 12 avec « Charger plus » ; c’est nécessaire car l’API ne propose pas de filtre de decks par cours/chapitre. Le fil, les cours, les enregistrés, les profils et l’historique utilisent la pagination serveur. Sur de très grandes bibliothèques, ajouter un filtre serveur serait préférable.

## Révision

Pas de démarrage vide ou automatique. Espace retourne la carte hors des contrôles interactifs et des champs, et chaque nouvelle carte revient au recto. Sous la carte de révision, trois repères annotent la carte courante : **Je ne connais pas** (rouge, touche 1), **J'ai un doute** (orange, touche 2) et **Je connais** (vert, touche 3). Le premier repère d'une carte avance à la suivante ; un nouveau choix sur la même carte remplace le précédent. Il n'y a pas de bouton Suivante : il sautait une carte et faisait monter « cartes parcourues » sans repère. **Précédente** revient en arrière, **Continuer** ne réapparaît que sur une carte déjà annotée. Pendant la session, l'écran affiche la position (« Carte n sur total ») et le nombre de repères, séparément. Dans l’aperçu du paquet, la révision et le fil, le retournement est une rotation 3D : la carte se soulève, un reflet la traverse, le recto a un liseré violet et le verso un liseré vert. Changer de carte la fait entrer en glissant. Avec `prefers-reduced-motion`, le changement de face est instantané et la face masquée n’est plus exposée une fois l’animation terminée. Le résumé compte les **cartes uniques parcourues**, la durée approximative et, si au moins une carte est annotée, un taux : connu vaut 1, le doute 0,5 et inconnu 0. Les cartes non annotées ne comptent pas dans ce taux. L’API accepte le nombre unique dans `cardsVisited` même si elle autorise aussi des passages répétés.

Un seul POST est déclenché lors de la fin de session ; verrou en cours et après succès. En cas d’échec, le résumé reste en mémoire et un bouton permet un nouvel essai explicite. **Limite de protocole :** une réponse réseau perdue peut cacher un POST effectivement enregistré ; sans clé d’idempotence côté API, un retry peut créer un doublon. L’interface prévient de vérifier l’historique. Le résumé n’est pas conservé après fermeture de l’onglet.

## Confidentialité réellement disponible

Visibilité par paquet et champs publics de profil uniquement. Aucun faux réglage « profil privé », aucune fonctionnalité suivre/commenter, aucun score de maîtrise, aucune statistique inventée. Les compteurs d’abonnements zéro de l’API ne sont pas présentés comme une fonctionnalité. Email, historique, cours et chapitres privés ne sont pas affichés sur les profils.

## Interface et composants

Fond `#F8F8FC`, primaire `#6C5CE7`, surfaces blanches à rayons 20 px, police système locale. Sidebar desktop, navigation basse sous 768 px avec safe-area, fil centré et panneau conseil sur grands écrans. Composants communs : UiButton (primary/secondary/ghost/danger et busy), UiField (label, hint, erreurs aria), Avatar, EmptyState, LoadState, ConfirmDialog (dialog natif, focus piégé par navigateur et restauré), DeckCard, CardFace (texte et image HTTP, sans `javascript:`), CardFields (saisie des deux faces), FlipCard (retournement 3D) et QuickCardDialog (création depuis `/create`).

Focus visible, lien d’évitement, champs et erreurs associés, boutons tactiles, attributs pressed/busy, messages live, textes bruts et respect des mouvements réduits. Les confirmations de sortie utilisent les boîtes natives du navigateur. Les tests responsive automatisés ne remplacent pas un audit lecteur d’écran/contraste exhaustif.

## Vérifier

### Avant chaque commit

`npm install` (ou `npm ci`) active automatiquement le hook Git Husky via `prepare`. Pour l'activer sur une installation existante, exécuter `npm run prepare` depuis ce dossier.

Chaque `git commit` lance `npm run check` : tous les tests unitaires (`npm test`), puis la vérification TypeScript et le build de production (`npm run build`). Un échec bloque le commit ; corriger le problème et recommencer. Cette commande peut aussi être exécutée manuellement. Les contrôles portent sur les fichiers présents dans le répertoire de travail, pas uniquement les changements indexés ; après une correction, indexer à nouveau les fichiers concernés.

Les tests E2E et d'intégration MongoDB restent séparés et ne sont pas exécutés par le hook. Le hook est une protection locale contournable ; les contrôles GitHub Actions restent nécessaires.

### Commandes de validation

Exécuter séquentiellement : `npm run build` (vue-tsc strict + Vite), `npm test`, `npx playwright install chromium` au premier lancement, puis `npm run test:e2e`.

Les mocks HTTP sont **exclusivement** sous `tests/` : aucun mock dans le bundle applicatif. Playwright démarre son propre serveur Vite éphémère, l’arrête en fin de suite, et n’accède jamais à une base utilisateur. Projets Chromium desktop/mobile et vérification de largeur à 360, 768, 1280 px. Traces en cas d’échec sous `test-results/`.

Si le port 5173 est occupé par un serveur de développement, définir temporairement `PLAYWRIGHT_PORT` (par exemple 5175) pour la suite mockée. Le serveur existant n’est jamais arrêté ni réutilisé. L’intégration réelle conserve ses ports isolés 3001/5174.

La suite couvre contrat JSON/cookies/401/erreurs, UTF-8 et redirections, logique de révision, composants, navigation anonyme/authentifiée, recherche/pagination/likes/save, confirmation manuelle d’email, inscription avec vérification, cours/chapitres/cascade/ordre, éditeur/publication/texte brut, panne/brouillon/protection de sortie, révision/résumé/retry et profils. Les tests navigateur prouvent l’interface contre le contrat simulé, **pas** les garanties transactionnelles de la DB réelle. Une recette avec backend réel et SMTP reste nécessaire en préproduction.

### E2E frontend + backend + MongoDB éphémère

Depuis ce dossier, exécuter `npm run test:integration`, après installation des dépendances des **deux** projets et de Chromium (`npx playwright install chromium`). Aucun serveur manuel ni fichier d’environnement n’est nécessaire. Ne pas lancer plusieurs exécutions simultanées : les ports dédiés **3001** et **5174** doivent être libres ; les serveurs existants ne sont jamais réutilisés.

- Configuration distincte `playwright.integration.config.ts`, tests exclusivement sous `tests/integration/` ; `test:e2e` conserve `testDir: tests/e2e`, Vitest conserve `tests/unit/**/*.test.ts`. Aucun mock/interception HTTP dans la suite réelle.
- Playwright lance `npm --prefix ../flashcard-back exec -- tsx ../flashcard-back/tests/e2e-server.ts` depuis le frontend, puis Vite en mode `integration`, origine **http://localhost:5174**. `API_PROXY_TARGET=http://127.0.0.1:3001` est une variable serveur ; `VITE_API_BASE_URL=/api` est explicitement fixé. Ce mode désactive totalement la lecture des fichiers `.env*` par Vite.
- Le serveur QA n’importe ni dotenv ni le serveur de développement backend. Il construit sa configuration test explicitement : URI fournie uniquement par `MongoMemoryReplSet`, secret réservé aux tests, `CORS_ORIGIN` et `FRONTEND_URL` à `http://localhost:5174`, SMTP absent, confirmation email désactivée. Aucune connexion à une DB utilisateur/Atlas, aucune modification des fichiers d’environnement.
- MongoDB démarre avec un membre replica set, une base et un répertoire de données temporaires, puis les modèles/index sont initialisés avant l’écoute HTTP. Le binaire est réutilisé dans le cache backend ; un premier téléchargement peut prendre jusqu’à 10 minutes (réseau et exécution de MongoDB requis).
- Parcours Chromium desktop : inscriptions UI A/B et restauration des cookies, cours/chapitre/paquet/cartes et ordre via UI A, révision persistée une seule fois, publication, recherche/like/save persistés via UI B, bibliothèque enregistrée et profil public. Contrôles API avec les cookies des contextes réels et contexte anonyme : CORS exact, refus des lectures/écritures étrangères, absence d’informations sensibles du profil, puis dépublication UI A et disparition du fil/sauvegardes/profil, 404 par lien direct et anciennes relations sociales.
- Nettoyage explicite attendu avant l’arrêt des processus Playwright : fermeture du store, de Mongoose et du replica set via une route de cycle de vie **uniquement dans le serveur QA loopback**, nécessaire sous Windows où la terminaison d’un arbre de processus ne livre pas SIGTERM. SIGINT/SIGTERM effectuent le même nettoyage. Aucun serveur permanent. Ne pas exposer ce serveur QA au réseau ; un arrêt brutal de l’OS ne garantit pas un teardown applicatif.
- Traces/HAR désactivés pour ne pas enregistrer les mots de passe/cookies du scénario ; captures uniquement à l’échec sous `test-results/integration/`. Les identités et mots de passe sont fictifs et dédiés à la base éphémère.

Validation du 18 octobre 2026 : **1 scénario réel réussi deux fois sur des bases temporaires distinctes** (29,1 s puis 34,9 s au total), nettoyage explicite confirmé et contrôle final : ports 3001/5174 libres, aucun processus mongod restant. Non-régression exécutée : builds frontend/backend réussis, **22 tests unitaires frontend**, **36 E2E mockés** desktop/mobile et **20 tests backend** réussis. Aucun changement métier requis. Cette preuve ne remplace pas une recette SMTP, Atlas/production, Firefox/WebKit ou un audit d’accessibilité.

### Résultats exécutés le 18 octobre 2026

- `npm install` : dépendances et lockfile installés ; avertissements de moteurs transitifs sous Node 24.13.1 et de dépréciation lucide signalés plus haut.
- `npm run build` : **réussi**, TypeScript strict et compilation de production.
- `npm test` : **22 tests réussis**, 3 fichiers (API/validation, révision, composants).
- `npx playwright install chromium` : **réussi**.
- `npm run test:e2e` : **36 tests réussis**, 18 scénarios joués sur ordinateur et mobile, environ 37 secondes. Contrôle sans débordement horizontal à 360, 768 et 1280 px ; captures du fil desktop/mobile relues visuellement.
- `npm audit` : **0 vulnérabilité**.
- Rapport HTML statique dans `playwright-report/index.html` (ignoré Git). Aucun serveur permanent maintenu après les tests.

Réserves de la validation frontend initiale : pas de recette MongoDB/SMTP dans ces suites mockées (la validation MongoDB réelle isolée est décrite ci-dessus), pas de certification exhaustive lecteur d’écran, pas de tests Firefox/WebKit. Les tâches OpenSpec existantes ne sont volontairement pas cochées : certaines incluent des validations backend/exploitation hors du périmètre frontend demandé.

## Production et cloud

`npm run build` produit `dist/`. `npm run preview` permet un aperçu local, pas un serveur de production. Héberger les actifs statiques, conserver les noms hashés et mettre le document HTML en cache court.

Configurer un **fallback SPA vers `/index.html` pour les routes frontend**. Exclure impérativement `/api/*` de ce fallback et transmettre ces requêtes au backend, sans réécrire son préfixe `/api`. Recommandation : même origine HTTPS pour frontend et `/api` via reverse proxy ; même site au minimum pour les cookies SameSite=Lax.

Aligner exactement `CORS_ORIGIN` et `FRONTEND_URL` backend avec l’origine publique, configurer `TRUST_PROXY`, HTTPS, cookie Secure et SMTP production. Ne jamais mettre un joker CORS avec credentials. Le proxy Vite n’existe qu’en développement. Un backend réellement cross-site requiert une revue cookies/CSRF hors de cette livraison. Les limitations de débit multi-instance, MongoDB replica set, sauvegardes et SMTP sont des responsabilités d’exploitation backend.
## Publications statiques (CMS Markdown)

Les contenus éditoriaux peuvent être publiés sans créer de document MongoDB ni de compte utilisateur. Ils sont chargés à la compilation depuis `src/content/static/*.md`. Un profil virtuel est créé à partir des champs `author`, `authorName` et `authorBio` ; par exemple `static_mnemo`. Le fil et le profil listent automatiquement les fichiers dont `draft` ne vaut pas `true`.

Exemple de fichier :

```md
---
slug: listes-python
author: static_mnemo
authorName: Mnemo
authorBio: Cours préparés par l’équipe.
course: Python
title: Les listes en Python
description: Comprendre les listes.
subject: Programmation
level: Débutant
draft: false
---

## Définition

Une liste conserve plusieurs valeurs ordonnées.

## Cartes

Q: Comment lire le premier élément ?
A: Avec `liste[0]`.

Q: Que fait append ?
A: Ajoute une valeur à la fin.
```

`slug` définit les routes `/static/:slug` et `/static/:slug/study`. Le `course` regroupe les paquets sur le profil auteur. Les cartes utilisent une paire de lignes `Q:` / `A:` séparées par une ligne vide. Le texte avant `## Cartes` est présenté comme contenu du cours. Les révisions statiques sont locales à la page : elles ne créent pas d’historique en base. Une modification Markdown est prise en compte au prochain build frontend. Ce profil et ces publications ne peuvent pas être édités ou supprimés via l’API.

Les fichiers de cours peuvent contenir les sections optionnelles `## Définition`, `## Exemple` et `## À retenir` ; chaque section est affichée seulement si elle contient du texte. Le cours accepte également du texte introductif avant la première section. Le seul contenu obligatoire est au moins une carte `Q:` / `A:`. Les valeurs question et réponse peuvent occuper plusieurs lignes et inclure une image Markdown, par exemple `![Drapeau](https://example.org/drapeau.png)` ; les images HTTP(S) et les chemins locaux absolus sont affichés.

Les utilisateurs peuvent aussi enregistrer un paquet statique depuis sa page. Cette action conserve uniquement le slug comme signet lié à leur utilisateur dans MongoDB ; le contenu et le profil auteur restent dans le Markdown. Les signets statiques apparaissent dans Bibliothèque → Enregistrés.
