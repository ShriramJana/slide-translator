import { useEffect, useState } from 'react'
import { LANGUAGES, downloadBlob, getMode, translatePptx, validateFile } from './api'
import type { Mode, Translation } from './api'
import { DoneDialog, ErrorDialog, LanguageDialog, ProgressDialog } from './components/Dialogs'
import { Dropzone } from './components/Dropzone'
import { LayoutIcon, ShieldIcon } from './components/icons'
import { Logo } from './components/Logo'
import './App.css'

type Status = 'idle' | 'ready' | 'processing' | 'done' | 'error'

const MODE_LABELS: Record<Mode, string> = {
  deepl: 'DeepL connected',
  mock: 'Mock mode: text is only tagged',
  offline: 'Backend unreachable',
}

function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [lang, setLang] = useState('JA')
  const [error, setError] = useState('')
  const [uploaded, setUploaded] = useState(false)
  const [result, setResult] = useState<Translation | null>(null)
  const [mode, setMode] = useState<Mode | null>(null)

  const languageName = LANGUAGES.find((l) => l.code === lang)?.name ?? lang

  useEffect(() => {
    getMode().then(setMode)
  }, [])

  function selectFile(picked: File) {
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

  async function translate() {
    if (!file) return
    setStatus('processing')
    setUploaded(false)
    setError('')
    setResult(null)
    try {
      setResult(await translatePptx(file, lang, () => setUploaded(true)))
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
    <>
      <header className="topbar">
        <div className="brand">
          <Logo size={34} accent="var(--accent)" bg="var(--bg)" />
          FlipDeck
        </div>
        {mode && <span className={`mode mode-${mode}`}>{MODE_LABELS[mode]}</span>}
      </header>

      <main className="page">
        <h1>Translate your slides</h1>
        <p className="lead">Upload a PowerPoint and get it back in another language, layout intact.</p>

        <Dropzone onFile={selectFile} />

        {status === 'error' && !file && (
          <p className="file-error" role="alert">
            {error}
          </p>
        )}

        <div className="notes">
          <span>
            <LayoutIcon />
            Text boxes, tables and grouped shapes stay where they are
          </span>
          <span>
            <ShieldIcon />
            Files are not stored on this server
          </span>
        </div>
      </main>

      {status === 'ready' && file && (
        <LanguageDialog file={file} lang={lang} onLangChange={setLang} onConfirm={translate} onClose={reset} />
      )}
      {status === 'processing' && file && (
        <ProgressDialog fileName={file.name} languageName={languageName} uploaded={uploaded} />
      )}
      {status === 'done' && result && (
        <DoneDialog
          fileName={result.filename}
          languageName={languageName}
          onDownload={() => downloadBlob(result.blob, result.filename)}
          onReset={reset}
        />
      )}
      {status === 'error' && file && <ErrorDialog message={error} onRetry={translate} onReset={reset} />}
    </>
  )
}

export default App
