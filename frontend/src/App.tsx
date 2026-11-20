import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { LANGUAGES, downloadBlob, getMode, translatePptx, validateFile } from './api'
import type { Mode, Translation } from './api'
import './App.css'

type Status = 'idle' | 'ready' | 'processing' | 'done' | 'error'

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [lang, setLang] = useState('JA')
  const [error, setError] = useState('')
  const [result, setResult] = useState<Translation | null>(null)
  const [mode, setMode] = useState<Mode | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const busy = status === 'processing'
  const langName = LANGUAGES.find((l) => l.code === lang)?.name ?? lang

  useEffect(() => {
    getMode().then(setMode)
  }, [])

  function selectFile(picked: File | undefined) {
    if (!picked) return
    setResult(null)
    const problem = validateFile(picked)
    if (problem) {
      setFile(null)
      setError(problem)
      setStatus('error')
    } else {
      setFile(picked)
      setError('')
      setStatus('ready')
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    selectFile(e.target.files?.[0])
    e.target.value = ''
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (!busy) selectFile(e.dataTransfer.files[0])
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    if (!busy) setDragging(true)
  }

  async function handleTranslate() {
    if (!file) return
    setStatus('processing')
    setError('')
    setResult(null)
    try {
      setResult(await translatePptx(file, lang))
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed.')
      setStatus('error')
    }
  }

  function reset() {
    setFile(null)
    setResult(null)
    setError('')
    setStatus('idle')
  }

  return (
    <main className="card">
      <header>
        <h1>Slide Translator</h1>
        <p className="subtitle">Upload a PowerPoint and get it back translated, layout intact.</p>
        {mode === 'mock' && <p className="badge">Mock mode: text is only tagged</p>}
        {mode === 'offline' && <p className="badge badge-error">Backend unreachable</p>}
      </header>

      <div
        className={`dropzone${dragging ? ' dragging' : ''}${busy ? ' disabled' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
      >
        <input ref={inputRef} type="file" accept=".pptx" hidden disabled={busy} onChange={handleChange} />
        {file ? (
          <p className="file">
            <strong>{file.name}</strong>
            <span>{formatSize(file.size)}</span>
          </p>
        ) : (
          <p>Drag a .pptx file here</p>
        )}
        <button type="button" className="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
          {file ? 'Choose a different file' : 'Choose file'}
        </button>
        <p className="hint">.pptx only, up to 10 MB</p>
      </div>

      <label className="field">
        Translate into
        <select value={lang} disabled={busy} onChange={(e) => setLang(e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="primary" disabled={!file || busy} onClick={handleTranslate}>
        Translate
      </button>

      <div className="status" aria-live="polite">
        {busy && file && (
          <p className="progress">
            <span className="spinner" />
            Translating {file.name} into {langName}…
          </p>
        )}
        {status === 'error' && <p className="error">{error}</p>}
        {status === 'done' && result && (
          <>
            <p className="success">Done</p>
            <div className="actions">
              <button type="button" className="primary" onClick={() => downloadBlob(result.blob, result.filename)}>
                Download {result.filename}
              </button>
              <button type="button" className="secondary" onClick={reset}>
                Translate another
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default App
