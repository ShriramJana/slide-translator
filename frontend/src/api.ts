export const LANGUAGES = [
  { code: 'JA', name: 'Japanese', native: '日本語' },
  { code: 'ZH', name: 'Chinese', native: '中文' },
  { code: 'KO', name: 'Korean', native: '한국어' },
  { code: 'ES', name: 'Spanish', native: 'Español' },
  { code: 'FR', name: 'French', native: 'Français' },
  { code: 'DE', name: 'German', native: 'Deutsch' },
  { code: 'PT-BR', name: 'Portuguese (Brazil)', native: 'Português' },
  { code: 'IT', name: 'Italian', native: 'Italiano' },
]

const KEY_STORAGE = 'deepl-api-key'
const UNREACHABLE = 'Could not reach the server. Is the backend running?'

export type Mode = 'deepl' | 'mock' | 'offline'

export type ServerStatus = {
  mode: Mode
  maxMb: number
}

export type Usage = {
  used: number
  limit: number | null
}

export type Translation = {
  blob: Blob
  filename: string
}

// The DeepL key a visitor types into Settings lives only in their browser.
// localStorage can be blocked (private windows), so every access is guarded.
export function getSavedKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export function saveKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key)
    else localStorage.removeItem(KEY_STORAGE)
  } catch {
    // nothing to do, the key just won't be remembered
  }
}

function keyHeaders(key = getSavedKey()): Record<string, string> {
  return key ? { 'X-DeepL-Key': key } : {}
}

export function validateFile(file: File, maxMb: number): string | null {
  if (!file.name.toLowerCase().endsWith('.pptx')) {
    return 'Only .pptx files are supported.'
  }
  if (file.size === 0) {
    return 'The file is empty.'
  }
  if (file.size > maxMb * 1024 * 1024) {
    return `File is larger than ${maxMb} MB.`
  }
  return null
}

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export async function getStatus(): Promise<ServerStatus> {
  try {
    const res = await fetch('/api/health', { headers: keyHeaders() })
    if (!res.ok) return { mode: 'offline', maxMb: 10 }
    const body = await res.json()
    return { mode: body.mode === 'mock' ? 'mock' : 'deepl', maxMb: body.max_mb }
  } catch {
    return { mode: 'offline', maxMb: 10 }
  }
}

// Asks DeepL how much quota the key has used. Doubles as a check that the key works.
export async function checkKey(key: string): Promise<Usage> {
  let res: Response
  try {
    res = await fetch('/api/usage', { headers: keyHeaders(key) })
  } catch {
    throw new Error(UNREACHABLE)
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.error ?? UNREACHABLE)
  return body
}

// Uses XMLHttpRequest instead of fetch because it reports when the upload
// has finished, which lets the UI tell "uploading" apart from "translating".
export function translatePptx(file: File, lang: string, onUploaded?: () => void): Promise<Translation> {
  const form = new FormData()
  form.append('file', file)
  form.append('target_lang', lang)

  const stem = file.name.replace(/\.pptx$/i, '')
  const fallback = `${stem}_${lang.toLowerCase()}.pptx`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/translate')
    xhr.responseType = 'blob'
    for (const [name, value] of Object.entries(keyHeaders())) {
      xhr.setRequestHeader(name, value)
    }
    xhr.upload.onload = () => onUploaded?.()
    xhr.onerror = () => reject(new Error(UNREACHABLE))
    xhr.onload = async () => {
      if (xhr.status !== 200) {
        reject(new Error(await readError(xhr.response)))
        return
      }
      const filename = parseFilename(xhr.getResponseHeader('Content-Disposition')) ?? fallback
      resolve({ blob: xhr.response, filename })
    }
    xhr.send(form)
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.hidden = true
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function readError(body: Blob | null): Promise<string> {
  try {
    const data = JSON.parse(await body!.text())
    if (typeof data.error === 'string') return data.error
  } catch {
    // not JSON, e.g. the dev proxy answering for a stopped backend
  }
  return UNREACHABLE
}

function parseFilename(header: string | null): string | null {
  if (!header) return null
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (encoded) return decodeURIComponent(encoded[1])
  const plain = header.match(/filename="([^"]+)"/i)
  return plain ? plain[1] : null
}
