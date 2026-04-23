# VilleTracker — Frontend

Interface web pour explorer les données financières, fiscales et territoriales des communes françaises.



---

## Aperçu

VilleTracker agrège et visualise des données publiques sur les ~35 000 communes de France :

- **Carte interactive** — navigation par département et commune (Leaflet)
- **Finances communales** — recettes, dépenses, évolution pluriannuelle (Recharts)
- **Fiscalité** — taux particuliers et entreprises
- **Marchés publics** — DECP, montants, acheteurs
- **Immobilier** — DVF Cerema, évolution des prix
- **Élus** — mandats, historique électoral (RNE)
- **Eau potable** — qualité par commune
- **Mobilité, GES, énergie** — données territoriales

Les données sont issues exclusivement de sources ouvertes (data.gouv.fr, INSEE, Cerema…) et collectées par le backend.

---

## Stack technique

| Couche | Techno |
|--------|--------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Style | Tailwind CSS |
| Carte | Leaflet + react-leaflet |
| Graphiques | Recharts |
| Déploiement | nginx (via Docker) |

---

## Architecture

Ce frontend est conçu pour fonctionner derrière un reverse proxy nginx qui :
- Injecte le token d'authentification API côté serveur (jamais exposé au navigateur)
- Sert les assets statiques en production
- Proxifie les appels `/api/*` vers le backend FastAPI

Le frontend lui-même ne contient **aucun secret**.

---

## Démarrage local

Prérequis : Node.js 20+ ou Docker.

### Avec Docker (recommandé)

Se référer au `STARTUP.md` du dépôt principal — tout est orchestré via `docker compose`.

### Sans Docker

```bash
npm install
npm run dev
```

> Nécessite un backend local accessible sur `http://localhost:8000`.  
> Configurer le proxy dans `vite.config.ts` si besoin.

---

## Sources de données

Toutes les données affichées sont des **données publiques** mises à disposition par :

- [data.gouv.fr](https://www.data.gouv.fr) — plateforme nationale des données ouvertes
- [INSEE](https://www.insee.fr) — statistiques nationales
- [Cerema](https://www.cerema.fr) — DVF (demandes de valeurs foncières)
- [DINUM](https://www.numerique.gouv.fr) — RNE (répertoire national des élus)
- Ministère de l'Économie et des Finances — DECP, fiscalité locale, balances comptables

---

## Licence

Ce projet est distribué sous licence **GNU Affero General Public License v3.0 (AGPL-3.0)**.

En résumé :
- ✅ Utilisation, modification et redistribution libres
- ✅ Usage personnel, éducatif ou commercial autorisé
- ⚠️ Toute version modifiée **doit être publiée** sous la même licence (y compris si hébergée en ligne)
- ⚠️ L'auteur original **doit être crédité** dans les travaux dérivés

Voir le fichier [LICENSE](LICENSE) pour le texte complet.

**Auteur original** : Noé Fraisse — [github.com/noe-fraisse](https://github.com/noe-fraisse)

---

## Signaler une faille de sécurité

Voir [SECURITY.md](SECURITY.md).

---

## Contribuer

Issues et pull requests bienvenues sur ce dépôt.  
Pour toute question sur le backend ou la collecte de données, ouvrir une issue en précisant le contexte.
