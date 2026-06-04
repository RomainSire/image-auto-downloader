import { app } from 'electron'
import { join } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { ApiKeys, Config } from '../shared/types'

/**
 * Lecture/écriture de `userData/config.json`.
 *
 * Le fichier peut être absent (1er lancement) ou partiel/corrompu : toute
 * lecture passe par `normalize()` qui garantit un `Config` complet et typé.
 * Un cache mémoire évite de relire le disque à chaque appel.
 */

const DEFAULT_CONFIG: Config = {
  apiKeys: { unsplash: '', pexels: '', pixabay: '' },
  lastDestination: '',
  language: 'en'
}

let cache: Config | null = null

function configPath(): string {
  return join(app.getPath('userData'), 'config.json')
}

/** Remet n'importe quelle valeur disque dans la forme stricte d'un `Config`. */
function normalize(raw: unknown): Config {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Config>
  const k = (r.apiKeys && typeof r.apiKeys === 'object' ? r.apiKeys : {}) as Partial<ApiKeys>
  return {
    apiKeys: {
      unsplash: typeof k.unsplash === 'string' ? k.unsplash : '',
      pexels: typeof k.pexels === 'string' ? k.pexels : '',
      pixabay: typeof k.pixabay === 'string' ? k.pixabay : ''
    },
    lastDestination: typeof r.lastDestination === 'string' ? r.lastDestination : '',
    language: r.language === 'fr' || r.language === 'ja' ? r.language : 'en'
  }
}

export async function getConfig(): Promise<Config> {
  if (cache) return cache
  try {
    cache = normalize(JSON.parse(await readFile(configPath(), 'utf-8')))
  } catch {
    // Fichier absent ou illisible → valeurs par défaut (non écrites tant
    // que l'utilisateur n'a rien enregistré).
    cache = { ...DEFAULT_CONFIG, apiKeys: { ...DEFAULT_CONFIG.apiKeys } }
  }
  return cache
}

/**
 * Fusionne `partial` dans la config courante et persiste sur disque.
 * `apiKeys` est fusionné clé par clé (on peut mettre à jour une seule source).
 * Renvoie la config résultante (pratique pour le renderer).
 */
export async function setConfig(partial: Partial<Config>): Promise<Config> {
  const current = await getConfig()
  const next: Config = {
    apiKeys: { ...current.apiKeys, ...(partial.apiKeys ?? {}) },
    lastDestination: partial.lastDestination ?? current.lastDestination,
    language: partial.language ?? current.language
  }
  cache = next
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(configPath(), JSON.stringify(next, null, 2), 'utf-8')
  return next
}

export async function getApiKeys(): Promise<ApiKeys> {
  return (await getConfig()).apiKeys
}
