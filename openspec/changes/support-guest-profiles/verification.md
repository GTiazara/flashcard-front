# Verification Report

## Scope

Changement documentaire du 18 octobre 2026 : nouveaux artefacts OpenSpec et guide racine uniquement. Aucun changement des sources, tests ou fichiers d'environnement ; aucune connexion à la DB utilisateur et aucune migration de cette base. Les résultats applicatifs ci-dessous proviennent des validations **déjà exécutées par les sous-agents**, rapportées dans les README [backend](../../../../flashcard-back/README.md) et [frontend](../../../README.md). Ils n'ont pas été réexécutés par l'auteur de cette passe documentaire.

## Reported Results

| Vérification antérieure | Résultat rapporté | Portée |
| --- | --- | --- |
| Build backend | Réussi | Compilation TypeScript |
| Tests backend | 151 réussis, 6 ignorés | 7 fichiers ; cas standalone ignorés au passage replica set seulement, exécutés dans le passage standalone |
| Build frontend | Réussi | Typage strict et bundle |
| Tests unitaires frontend | 46 réussis | Auth/contrat, erreurs, initialisation et composants |
| E2E mockés | 46 réussis | Chromium ordinateur/mobile, API simulée |
| E2E réels | 2 réussis | Frontend/API/MongoDB replica set éphémère, sans mock HTTP |

## Tested Checklist

- [x] Backend : restauration après perte de session, cookies invalides/forgés, isolation, unicité, permissions, rate limit et Secure en production simulée.
- [x] Backend : conversion même `_id`, conflits/concurrence, conservation de propriété, login/logout sans fusion, confirmation et compensation SMTP simulée.
- [x] Migration isolée : anciens index normal/sparse, idempotence, refus doublons/définitions inconnues, tentative de restauration après panne injectée.
- [x] Frontend : initialisation concurrente, panne, 401 métier sans recréation automatique, confirmation en attente, annulation/échec de sortie et réponses obsolètes.
- [x] Navigateur réel : cookie durable HttpOnly et durée demandée, restauration après retrait du seul cookie session, conversion au même `_id`, contenus conservés et isolation après sortie.
- [x] Nettoyage rapporté par les sous-agents : stores/Mongoose/MongoDB éphémère fermés, ports QA 3001/5174/5175 libres, aucun mongod restant au contrôle effectué alors. Ce n'est pas un contrôle actuel de ces ports.

## Current Validation

- [x] Lecture des contrats et des trois spécifications de référence ; scénarios originaux conservés dans chaque exigence MODIFIED.
- [x] `openspec validate support-guest-profiles --strict` exécuté dans cette passe : **Change 'support-guest-profiles' is valid**, code de sortie 0. Le premier passage signalait quatre exigences ADDED trop longues ; elles ont été raccourcies en déplaçant les détails dans leurs scénarios, puis le contrôle strict a réussi sans avertissement.
- Builds et suites applicatives : **non relancés ici**, conformément au périmètre documentaire.

## Limitations

- [ ] DB utilisateur : accès non testé, code 18 éventuel non résolu par le profil invité ; MongoDB et son authentification restent obligatoires.
- [ ] Migration sur DB utilisateur : **non réalisée**. Sauvegarde, arrêt de tous les producteurs, migration explicite et vérification opérateur restent nécessaires si l'ancien index existe.
- [ ] SMTP/TLS réels, hébergement de production et audit exhaustif d'accessibilité : non certifiés par ces résultats.
- Aucun test n'observe 400 jours réels : Max-Age ne garantit pas que le navigateur conservera le cookie. Aucune purge quotidienne ni garantie de récupération après suppression du cookie.
- SMTP et MongoDB ne constituent pas une transaction distribuée : un crash ou une panne de compensation peut nécessiter une inspection opérateur. Les tests d'erreur contrôlée ne prouvent pas une restauration sous toute panne.
- Les garanties standalone restent dégradées et mono-processus ; les tests éphémères ne certifient ni MongoDB 4.4 réel ni la topologie utilisateur.