export const LANGUAGES = [
  { code: 'JA', name: 'Japanese' },
  { code: 'ZH', name: 'Chinese' },
  { code: 'KO', name: 'Korean' },
  { code: 'ES', name: 'Spanish' },
  { code: 'FR', name: 'French' },
  { code: 'DE', name: 'German' },
  { code: 'PT-BR', name: 'Portuguese (Brazil)' },
  { code: 'IT', name: 'Italian' },
]

export const MAX_FILE_SIZE = 10 * 1024 * 1024

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

export async function translatePptx(file: File, lang: string): Promise<Translation> {
  const form = new FormData()
  form.append('file', file)
  form.append('target_lang', lang)

  let res: Response
  try {
    res = await fetch('/api/translate', { method: 'POST', body: form })
  } catch {
    throw new Error('Could not reach the server. Is the backend running?')
  }

  if (!res.ok) {
    throw new Error(await readError(res))
  }

  const stem = file.name.replace(/\.pptx$/i, '')
  const fallback = `${stem}_${lang.toLowerCase()}.pptx`
  const filename = parseFilename(res.headers.get('Content-Disposition')) ?? fallback
  return { blob: await res.blob(), filename }
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

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (typeof body.error === 'string') return body.error
  } catch {
    // not JSON, e.g. the dev proxy answering for a stopped backend
  }
  return 'Could not reach the server. Is the backend running?'
}

function parseFilename(header: string | null): string | null {
  if (!header) return null
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (encoded) return decodeURIComponent(encoded[1])
  const plain = header.match(/filename="([^"]+)"/i)
  return plain ? plain[1] : null
}
