# Image Auto Downloader

Application **desktop locale** (Windows) qui télécharge en masse des **images et vidéos libres de droit** pour alimenter un workflow de montage vidéo **b-roll**.

À partir d'un mot-clé (ex. « ramen », « tokyo night », « hands cooking »), l'app interroge plusieurs banques gratuites, télécharge les résultats dans un sous-dossier dédié, et les range dans un dossier central surveillé par [Immich](https://immich.app/) (recherche IA) et lié comme _bin_ dans Adobe Premiere Pro.

Un **switch Photos / Vidéos** en haut de l'app bascule le type de média téléchargé. En mode Vidéos, les sources qui n'ont pas d'API vidéo (Unsplash, Openverse) sont automatiquement grisées.

> App **perso, mono-utilisateur, sans déploiement ni authentification**. Pensée pour le PC de montage (Windows).

---

## Contexte

Le b-roll consiste à superposer des images d'illustration sur la vidéo principale (fond vert retiré). Le monteur a besoin de **grandes quantités d'images variées** sur des thèmes précis, libres de droit et sans attribution obligatoire.

Cette app est **le premier maillon de la chaîne** : elle télécharge des images fraîches à la demande, rangées en sous-dossiers par recherche, vers un dossier central (ex. `D:\BRoll\`) qui est ensuite indexé par Immich et accessible directement dans Premiere Pro.

## Fonctionnalités

- **Photos ou vidéos** : un switch en haut bascule le type de média téléchargé.
- Recherche par **mot-clé** sur 4 banques en parallèle (2 pour la vidéo : Pexels, Pixabay).
- Choix du **nombre de fichiers par source** et activation/désactivation source par source.
- En mode vidéo, sélection automatique de la résolution **~1080p** (plus petit côté).
- Rangement automatique : `{destination}/{AAAA-MM-JJ-motclé}/`, fichiers préfixés par source (`unsplash_<id>.jpg`, …).
- **Picker de dossier natif** + bouton « Ouvrir le dossier » (Explorateur Windows).
- **Suivi de progression** en temps réel et gestion d'erreurs par source (quota, API, disque).
- **Idempotence douce** : une image déjà présente n'est pas re-téléchargée.
- Interface **trilingue** : 🇬🇧 EN (défaut) · 🇫🇷 FR · 🇯🇵 日本語.

## Sources d'images

| Source                                      | Clé API requise   | Photo | Vidéo | Licence / filtre                                                     |
| ------------------------------------------- | ----------------- | :---: | :---: | -------------------------------------------------------------------- |
| [Unsplash](https://unsplash.com/developers) | Oui (Access Key)  | ✅ | ❌ | Libre, sans attribution obligatoire                                  |
| [Pexels](https://www.pexels.com/api/)       | Oui               | ✅ | ✅ | Libre, sans attribution obligatoire                                  |
| [Pixabay](https://pixabay.com/api/docs/)    | Oui               | ✅ | ✅ | Libre, sans attribution obligatoire                                  |
| [Openverse](https://api.openverse.org/)     | **Non** (anonyme) | ✅ | ❌ | Filtre `license=cc0,pdm` → CC0 + domaine public, usage commercial OK |

> **Vidéos** : seules **Pexels** (`/videos/search`) et **Pixabay** (`/api/videos/`) exposent une API vidéo. Unsplash et Openverse n'en ont pas → grisées en mode Vidéos. Les fichiers sont nommés `pexels_<id>.mp4`, `pixabay_<id>.mp4` et rangés dans le **même** sous-dossier que les photos.

> Les clés API se renseignent **dans l'app** (panneau Réglages), pas dans un fichier `.env`. Elles sont stockées localement dans `config.json` (voir ci-dessous).

## Stack technique

- **[Electron](https://www.electronjs.org/)** (desktop, process natif Windows pour le picker de dossier et l'ouverture de l'Explorateur).
- **TypeScript** partout (main, preload, renderer).
- **[electron-vite](https://electron-vite.org/)** (dev) + **[electron-builder](https://www.electron.build/)** (build `.exe`).
- Frontend **HTML/CSS/JS vanilla** (zéro framework).
- Réseau via **`fetch` natif** (pas d'axios), écriture disque via **`node:fs/promises`**.
- **i18n maison** (dictionnaire en/fr/ja, pas de lib).

## Prérequis

- **[Node.js](https://nodejs.org/)** ≥ 20.19 (ou ≥ 22.12) — développé sous Node 24.
- **[pnpm](https://pnpm.io/)** ≥ 10 — **gestionnaire de paquets exclusif** du projet (pas de `npm` ni `yarn`).

## Installation

```bash
pnpm install
```

## Configuration des clés API

Au premier lancement, si des clés manquent, l'app ouvre automatiquement le **panneau Réglages**. Y renseigner les clés Unsplash / Pexels / Pixabay (Openverse n'en demande pas). Le dossier de destination se choisit directement dans le formulaire principal (champ + bouton « Parcourir… ») ; le dernier dossier utilisé est mémorisé et pré-rempli au lancement suivant.

Les réglages sont persistés dans `config.json`, situé dans le dossier `userData` d'Electron :

- **Windows** : `%APPDATA%\image-auto-downloader\config.json`
- **Linux (dev)** : `~/.config/image-auto-downloader/config.json`

```jsonc
{
  "apiKeys": {
    "unsplash": "", // Access Key (Client-ID)
    "pexels": "",
    "pixabay": ""
    // Openverse : pas de clé (source anonyme)
  },
  "lastDestination": "D:\\BRoll", // pré-remplit le champ destination
  "language": "en" // "en" | "fr" | "ja"
}
```

## Développement

```bash
pnpm dev          # lance Electron en mode dev (hot reload)
pnpm typecheck    # vérification TypeScript (main + renderer)
pnpm lint         # ESLint
pnpm format       # Prettier
```

## Build

```bash
pnpm build:win      # installeur Windows (.exe NSIS)
pnpm build:linux    # Linux (.AppImage + .deb + .rpm)
pnpm build:mac      # macOS (.dmg) — à lancer sur un Mac
```

La cible **primaire est Windows** (PC de montage), mais le code étant 100 % cross-platform, les binaires **macOS** et **Linux** sont aussi fournis. Pas d'auto-update : les mises à jour sont rares et manuelles.

> ⚠️ Le `.dmg` macOS doit être généré **sur un Mac** (création + signature impossibles depuis Linux/Windows). Les paquets `.deb`/`.rpm` Linux sont produits par `fpm`, dont le ruby embarqué nécessite `libcrypt.so.1` sur la machine de build (présent sur Ubuntu ; sur Fedora : `sudo dnf install libxcrypt-compat`). Le `.rpm` requiert aussi `rpmbuild` (paquet `rpm` ; le runner CI Ubuntu l'installe automatiquement). L'`.AppImage`, lui, n'a aucune de ces dépendances.

### Releases multi-OS (CI)

Le workflow [`.github/workflows/release.yml`](.github/workflows/release.yml) compile les 3 OS sur des runners natifs GitHub Actions. Pour publier une version :

```bash
git tag v0.1.0
git push origin v0.1.0   # → build win/mac/linux + binaires attachés à la Release
```

Un déclenchement manuel (_workflow_dispatch_) produit les mêmes binaires en _artifacts_ téléchargeables, sans créer de Release.

## Structure du projet

```
image-auto-downloader/
├── package.json
├── electron.vite.config.ts  # 3 cibles : main / preload / renderer
├── electron-builder.yml     # packaging Windows
├── pnpm-workspace.yaml      # réglages pnpm (allowBuilds)
└── src/
    ├── main/                # process principal (Node)
    │   ├── index.ts         # cycle de vie app + fenêtre
    │   ├── ipc.ts           # handlers IPC
    │   ├── config.ts        # lecture/écriture config.json
    │   ├── downloader.ts    # orchestration des 4 sources
    │   └── sources/         # unsplash / pexels / pixabay / openverse
    ├── preload/             # contextBridge (API sûre exposée au renderer)
    └── renderer/            # UI vanilla (HTML/CSS/TS) + i18n
```

> Note : l'arborescence `src/renderer/` suit la convention du scaffold officiel electron-vite (`src/renderer/src/` + `src/renderer/assets/`).

## Sécurité Electron

`contextIsolation: true`, `nodeIntegration: false`. Le renderer n'accède jamais à Node directement : tout passe par le **preload** via `contextBridge`.

## IDE recommandé

[VS Code](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode).

## Licence

Projet personnel, non distribué. Les images téléchargées proviennent de sources libres de droit ; le filtre Openverse `cc0,pdm` garantit l'absence d'attribution obligatoire et l'usage commercial.
