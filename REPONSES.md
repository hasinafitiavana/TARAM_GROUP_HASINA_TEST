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