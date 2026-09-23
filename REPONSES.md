# Partie 1 — Revue de code et corrections

## Extrait A — Composant React
| Problème | Gravité | Correction proposée |
|---|---|---|
| Le useEffect n'a pas de tableau de dépendances : chaque changement de state provoque une nouvelle requête et peut créer une boucle. | Critique | Ajouter `[city]` comme dépendance à l'useEffect |
| city est concaténée directement dans l'URL. | Élevée | Utiliser `URLSearchParams` pour encoder la valeur. |
| En cas d'erreur sur le fetch, rien n'est géré. Et en plus le loading sera toujours true | Élevée |  gérer `catch` et remettre `loading` à `false` dans `finally`. |
| Les `<li>` n'ont pas de `key` stable. | Moyenne | Ajouter `key={listing.id}`. |
| `toLocaleString()` peut provoquer une erreur si `price` est nul ou une chaîne. | Moyenne | Valider/normaliser le contrat API et gérer les états vide et erreur. |