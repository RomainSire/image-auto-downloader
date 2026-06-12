import type { Lang } from '../../shared/types'

/**
 * i18n maison (DEV_PLAN §5.5) — 3 langues, défaut `en`, sans dépendance.
 *
 * - Libellés statiques : annotés `data-i18n="key"` (texte) /
 *   `data-i18n-placeholder="key"` (placeholder) dans le HTML →
 *   remplis par `applyTranslations()`.
 * - Chaînes dynamiques (erreurs, progression, états) : via `t(key, params?)`,
 *   avec interpolation `{name}`.
 * - La langue courante est persistée dans `config.json` (`language`) via
 *   `setLanguage()` ; chargée au démarrage avec `initLanguage()`.
 */

type Dict = Record<string, string>

const dict: Record<Lang, Dict> = {
  en: {
    'app.subtitle': 'Royalty-free b-roll — Unsplash · Pexels · Pixabay · Openverse',
    'settings.button': '⚙ Settings',
    'field.keyword': 'Search (keyword)',
    'field.keyword.ph': 'e.g. ramen, tokyo night, hands cooking…',
    'field.destination': 'Destination folder',
    'field.destination.ph': 'D:\\BRoll',
    'field.subfolder': 'Subfolder',
    'field.subfolder.ph': '2026-06-04-ramen',
    'field.browse': 'Browse…',
    'media.photos': 'Photos',
    'media.videos': 'Videos',
    'source.count': 'Count',
    'source.noVideo': 'No video',
    'download.button': 'Download',
    'download.openFolder': 'Open folder',
    'download.openFolderError': '✗ Cannot open folder: {error}',
    'settings.title': 'Settings',
    'settings.key.unsplash': 'Unsplash API key (Access Key)',
    'settings.key.pexels': 'Pexels API key',
    'settings.key.pixabay': 'Pixabay API key',
    'settings.key.ph.clientId': 'Client-ID…',
    'settings.key.ph.apikey': 'API Key…',
    'settings.openverseNote': 'Openverse requires no key (anonymous source).',
    'settings.language': 'Language',
    'settings.close': 'Close',
    'settings.save': 'Save',
    'status.loading': 'Loading configuration…',
    'status.missingKeys': '⚠ {n} missing API key(s): {keys}',
    'status.allKeysOk': '✓ All API keys are configured',
    'status.configError': '✗ Cannot read config: {error}',
    'settings.hintMissing': 'Enter the missing keys ({keys}) to get started.',
    'settings.saving': 'Saving…',
    'settings.saved': '✓ Saved',
    'settings.saveError': '✗ Failed: {error}',
    'progress.searching': 'Searching…',
    'download.errNoKeyword': '✗ Enter a keyword.',
    'download.errNoDest': '✗ Set a destination folder.',
    'download.errDestMissing': '✗ Destination folder does not exist: {path}',
    'download.errNoSource': '✗ Enable at least one source (count ≥ 1).',
    'download.inProgress': 'Downloading…',
    'download.empty': 'No results found for this keyword.',
    'download.doneWithErrors': '{total} file(s) downloaded — {failed} source(s) failed.',
    'download.doneOk': '✓ {total} file(s) downloaded to {path}',
    'download.failed': '✗ Download failed: {error}',
    'source.empty': 'No results',
    'error.rate_limit': 'Rate limit reached',
    'error.fs': 'Disk error',
    'error.api': 'API error'
  },
  fr: {
    'app.subtitle': 'B-roll libre de droit — Unsplash · Pexels · Pixabay · Openverse',
    'settings.button': '⚙ Réglages',
    'field.keyword': 'Recherche (mot-clé)',
    'field.keyword.ph': 'ex. ramen, tokyo night, hands cooking…',
    'field.destination': 'Dossier de destination',
    'field.destination.ph': 'D:\\BRoll',
    'field.subfolder': 'Sous-dossier',
    'field.subfolder.ph': '2026-06-04-ramen',
    'field.browse': 'Parcourir…',
    'media.photos': 'Photos',
    'media.videos': 'Vidéos',
    'source.count': 'Nombre',
    'source.noVideo': 'Pas de vidéo',
    'download.button': 'Télécharger',
    'download.openFolder': 'Ouvrir le dossier',
    'download.openFolderError': "✗ Impossible d'ouvrir le dossier : {error}",
    'settings.title': 'Réglages',
    'settings.key.unsplash': 'Clé API Unsplash (Access Key)',
    'settings.key.pexels': 'Clé API Pexels',
    'settings.key.pixabay': 'Clé API Pixabay',
    'settings.key.ph.clientId': 'Client-ID…',
    'settings.key.ph.apikey': 'API Key…',
    'settings.openverseNote': 'Openverse ne nécessite aucune clé (source anonyme).',
    'settings.language': 'Langue',
    'settings.close': 'Fermer',
    'settings.save': 'Enregistrer',
    'status.loading': 'Chargement de la configuration…',
    'status.missingKeys': '⚠ {n} clé(s) API manquante(s) : {keys}',
    'status.allKeysOk': '✓ Toutes les clés API sont configurées',
    'status.configError': '✗ Impossible de lire la config : {error}',
    'settings.hintMissing': 'Renseignez les clés manquantes ({keys}) pour commencer.',
    'settings.saving': 'Enregistrement…',
    'settings.saved': '✓ Enregistré',
    'settings.saveError': '✗ Échec : {error}',
    'progress.searching': 'Recherche…',
    'download.errNoKeyword': '✗ Saisissez un mot-clé.',
    'download.errNoDest': '✗ Indiquez un dossier de destination.',
    'download.errDestMissing': "✗ Le dossier de destination n'existe pas : {path}",
    'download.errNoSource': '✗ Activez au moins une source (nombre ≥ 1).',
    'download.inProgress': 'Téléchargement en cours…',
    'download.empty': 'Aucun résultat pour ce mot-clé.',
    'download.doneWithErrors': '{total} fichier(s) téléchargé(s) — {failed} source(s) en erreur.',
    'download.doneOk': '✓ {total} fichier(s) téléchargé(s) dans {path}',
    'download.failed': '✗ Échec du téléchargement : {error}',
    'source.empty': 'Aucun résultat',
    'error.rate_limit': 'Limite atteinte',
    'error.fs': 'Erreur disque',
    'error.api': 'Erreur API'
  },
  ja: {
    'app.subtitle': 'ロイヤリティフリー B-roll — Unsplash · Pexels · Pixabay · Openverse',
    'settings.button': '⚙ 設定',
    'field.keyword': '検索（キーワード）',
    'field.keyword.ph': '例：ramen、tokyo night、hands cooking…',
    'field.destination': '保存先フォルダー',
    'field.destination.ph': 'D:\\BRoll',
    'field.subfolder': 'サブフォルダー',
    'field.subfolder.ph': '2026-06-04-ramen',
    'field.browse': '参照…',
    'media.photos': '写真',
    'media.videos': '動画',
    'source.count': '枚数',
    'source.noVideo': '動画なし',
    'download.button': 'ダウンロード',
    'download.openFolder': 'フォルダーを開く',
    'download.openFolderError': '✗ フォルダーを開けません：{error}',
    'settings.title': '設定',
    'settings.key.unsplash': 'Unsplash API キー（Access Key）',
    'settings.key.pexels': 'Pexels API キー',
    'settings.key.pixabay': 'Pixabay API キー',
    'settings.key.ph.clientId': 'Client-ID…',
    'settings.key.ph.apikey': 'API Key…',
    'settings.openverseNote': 'Openverse はキー不要です（匿名ソース）。',
    'settings.language': '言語',
    'settings.close': '閉じる',
    'settings.save': '保存',
    'status.loading': '設定を読み込み中…',
    'status.missingKeys': '⚠ API キーが {n} 個未設定です：{keys}',
    'status.allKeysOk': '✓ すべての API キーが設定されています',
    'status.configError': '✗ 設定を読み込めません：{error}',
    'settings.hintMissing': '開始するには未設定のキー（{keys}）を入力してください。',
    'settings.saving': '保存中…',
    'settings.saved': '✓ 保存しました',
    'settings.saveError': '✗ 失敗：{error}',
    'progress.searching': '検索中…',
    'download.errNoKeyword': '✗ キーワードを入力してください。',
    'download.errNoDest': '✗ 保存先フォルダーを指定してください。',
    'download.errDestMissing': '✗ 保存先フォルダーが存在しません：{path}',
    'download.errNoSource': '✗ ソースを1つ以上有効にしてください（枚数 ≥ 1）。',
    'download.inProgress': 'ダウンロード中…',
    'download.empty': 'このキーワードの結果が見つかりませんでした。',
    'download.doneWithErrors': '{total} 件をダウンロード — {failed} 個のソースでエラー。',
    'download.doneOk': '✓ {total} 件を {path} にダウンロードしました',
    'download.failed': '✗ ダウンロード失敗：{error}',
    'source.empty': '結果なし',
    'error.rate_limit': 'レート制限に達しました',
    'error.fs': 'ディスクエラー',
    'error.api': 'API エラー'
  }
}

const DEFAULT_LANG: Lang = 'en'
let current: Lang = DEFAULT_LANG

export function getLanguage(): Lang {
  return current
}

/** Définit la langue de départ (sans persister) — au chargement de la config. */
export function initLanguage(lang: Lang): void {
  current = dict[lang] ? lang : DEFAULT_LANG
}

/** Traduit une clé dans la langue courante, avec interpolation `{name}`. */
export function t(key: string, params?: Record<string, string | number>): string {
  const template = dict[current][key] ?? dict[DEFAULT_LANG][key] ?? key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_m, name: string) =>
    name in params ? String(params[name]) : `{${name}}`
  )
}

/** Remplit tous les `[data-i18n]` / `[data-i18n-placeholder]` sous `root`. */
export function applyTranslations(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n
    if (key) el.textContent = t(key)
  })
  root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder
    if (key) el.setAttribute('placeholder', t(key))
  })
  document.documentElement.lang = current
}

/** Change la langue : applique au DOM + persiste dans `config.json`. */
export async function setLanguage(lang: Lang): Promise<void> {
  current = dict[lang] ? lang : DEFAULT_LANG
  applyTranslations()
  await window.api.setConfig({ language: current })
}
