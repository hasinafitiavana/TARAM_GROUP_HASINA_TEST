# Partie 1 — Revue de code et corrections

## Extrait A — Composant React
| Problème | Gravité | Correction proposée |
|---|---|---|
| Le useEffect n'a pas de tableau de dépendances : chaque changement de state provoque une nouvelle requête et peut créer une boucle. | Critique | Ajouter `[city]` comme dépendance à l'useEffect |
| city est concaténée directement dans l'URL. | Élevée | Utiliser `URLSearchParams` pour encoder la valeur. |
| En cas d'erreur sur le fetch, rien n'est géré. Et en plus le loading sera toujours true | Élevée |  gérer `catch` et remettre `loading` à `false` dans `finally`. |
| Les `<li>` n'ont pas de `key` stable. | Moyenne | Ajouter `key={listing.id}`. |
| `toLocaleString()` peut provoquer une erreur si `price` est nul ou une chaîne. | Moyenne | Valider/normaliser le contrat API et gérer les états vide et erreur. |



## Extrait B — Route API de recherche
| Problème | Gravité | Correction proposée |
|---|---|---|
| concatenation de city dans le SQL avec risque d'injection SQL. | Critique | Utiliser $1 et les paramètres PostgreSQL. |
| On a page en parametre mais jamais utilisé. donc pas de pagination ce qui peut ralentir quand nos données vont augmenter | Critique | utiliser les paginations et mettre limit dans la requete |
| Deux requêtes supplémentaires sont exécutées alors qu'ils peuvent etre en relation avec la table listings. | Élevée | Charger agence et photos par jointures et agrégation JSON dans une requête. |
| SELECT * peut exposer des colonnes inutiles ou sensibles. | Élevée | Énumérer les colonnes du contrat public. |
| Les paramètres ne sont pas validés. | Moyenne | Refuser les villes vides et les nombres invalides avec un 400. |
| Les erreurs de la requête ne sont pas transmises au middleware Express. | Élevée | Utiliser try/catch puis next(error). |

La correction  est dans partie_1/listingsRoutes.js

## Extrait C — Webhook de paiement

| Problème | Gravité | Correction proposée |
|---|---|---|
| Aucune authentification du webhook : une requête forgée peut confirmer un paiement. | Critique | Vérifier une signature HMAC du corps brut avec comparaison en temps constant. |
| Aucun identifiant d'événement n'est dédupliqué. | Critique | Stocker `event.id` avec une contrainte unique et ignorer les doublons. |
| Email et CRM sont appelés dans la requête HTTP ; le CRM peut prendre 8 secondes. | Critique | Persister un job/outbox puis répondre rapidement en 200. |
| Les effets externes peuvent être exécutés deux fois après un retry. | Élevée | Rendre le traitement du worker idempotent avec `eventId`. |
| Le contenu du payload n'est pas validé. | Élevée | Vérifier au minimum `id`, `type` et les champs requis du paiement. |
| Les erreurs ne sont pas centralisées et la mise à jour n'est pas transactionnelle. | Élevée | Utiliser une transaction et transmettre les erreurs à `next`. |


La correction  est dans partie_1/payementWebhooks.js

## Partie 3 — Gestion d'incident

### 3.1 — Vendredi, 21h40

À 21h40, je commence par confirmer l'incident : est-ce bien l'API publique qui souffre, quelles routes renvoient les 5xx et depuis quelle minute ? Je regarde en parallèle le trafic, les codes HTTP, le temps de réponse par route, l'utilisation CPU/mémoire et l'état de PostgreSQL (connexions, requêtes lentes, verrous). Je compare tout cela avec les dix minutes avant la campagne SMS.

Ma première hypothèse est `/api/listings`. Dans l'extrait B, une recherche lance une requête pour les annonces, puis deux autres par annonce, sans pagination. Avec le trafic SMS, cela peut très vite saturer le pool PostgreSQL. Je cherche donc cette route dans les traces et les requêtes lentes, tout en vérifiant qu'il ne s'agit pas plutôt d'une panne d'infrastructure, d'une base indisponible ou d'un déploiement récent.

Je n'attends pas d'avoir la cause certaine pour réduire la charge : je limite les requêtes sur les routes coûteuses, j'active le cache des recherches les plus demandées et je réduis temporairement les réponses trop lourdes. Si un déploiement récent est en cause, je le retire. Si besoin, j'ajoute des instances API, mais je n'augmente pas le pool de connexions base de données à l'aveugle : cela pourrait empirer la situation.

Avant 21h50, j'appelle ou j'écris au client : l'incident est confirmé, des mesures sont déjà en place pour soulager le site, et je lui donne un nouveau point dans dix minutes. Ensuite, je donne des nouvelles toutes les dix minutes : ce que l'on sait, l'impact et ce qui est fait. Je préfère ne pas annoncer une heure de retour à la normale tant que je ne peux pas la tenir. Une fois le service stabilisé, je le surveille encore au moins 30 minutes. Le lendemain, je fais un post-mortem, je corrige la route avec une requête agrégée et de la pagination, puis j'ajoute un test de charge et les alertes manquantes.

### 3.2 — Avant le lancement

- **Taux de 5xx API** : alerte au-delà de 2 % pendant 5 minutes, dans Grafana/Prometheus avec notification PagerDuty.
- **Latence API p95** : alerte au-delà de 2 secondes pendant 5 minutes, à partir des métriques applicatives dans Grafana.
- **Saturation PostgreSQL** : alerte si le pool dépasse 80 % ou si les requêtes lentes dépassent une seconde pendant 5 minutes, via `pg_stat_activity` et l'exporter PostgreSQL.
- **Trafic anormal par route** : alerte si `/api/listings` dépasse deux fois son trafic habituel pendant 5 minutes, via les métriques du reverse proxy.
