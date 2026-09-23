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