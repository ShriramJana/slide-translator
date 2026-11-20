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

export const MAX_FILE_SIZE = 10 * 1024 * 1024

const UNREACHABLE = 'Could not reach the server. Is the backend running?'

export type Mode = 'deepl' | 'mock' | 'offline'

export type Translation = {
  blob: Blob
  filename: string
}

export function validateFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.pptx')) {
    return 'Only .pptx files are supported.'
  }
  if (file.size === 0) {
    return 'The file is empty.'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File is larger than 10 MB.'
  }
  return null
}

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export async function getMode(): Promise<Mode> {
  try {
    const res = await fetch('/api/health')
    if (!res.ok) return 'offline'
    const body = await res.json()
    return body.mode === 'mock' ? 'mock' : 'deepl'
  } catch {
    return 'offline'
  }
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
