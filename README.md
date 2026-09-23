# Test technique — TanàImmo

## Prérequis

- Node.js 18 ou supérieur (le projet utilise `fetch`, `AbortController` et `node:test`).
- Aucun service externe ni base de données n'est nécessaire pour exécuter les tests.

## Configuration locale

Créer un fichier `.env` à partir de `.env.example`, puis renseigner le token CRM local :

```bash
cp .env.example .env
```

`CRM_TOKEN` ne doit jamais être ajouté au dépôt. `CRM_BASE_URL` peut être remplacée par l'URL du mock pendant les tests d'intégration.

## Lancer les tests

```bash
npm test
```

Cette commande exécute les tests unitaires du client CRM avec `node:test` et un `fetch` simulé.

## Travail réalisé

- Partie 1 : corrections des extraits de route de recherche et de webhook de paiement ; diagnostic dans `REPONSES.md`.
- Partie 2 : `createLead(lead)` envoie un lead au CRM avec token Bearer, timeout de 5 secondes, validation, clé d'idempotence et trois tentatives maximum.
- Les erreurs `429`, `500`, `502`, `503`, les timeouts et les erreurs réseau sont réessayés. `Retry-After` est respecté pour un `429`.
- Deux tests couvrent `429` puis succès, ainsi que trois `500` suivis d'un abandon.

## Non réalisé

- Partie 3 reste à rédiger dans `REPONSES.md`.
- Le connecteur n'est pas branché à un véritable formulaire ou à un CRM réel : les tests utilisent un mock HTTP en mémoire.

## Temps passé

À renseigner avant le rendu avec le temps réellement passé sur le test.
