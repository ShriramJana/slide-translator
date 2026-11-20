import { formatSize } from '../api'
import { AlertIcon, CheckIcon, SlidesIcon } from './icons'
import { LanguageSelect } from './LanguageSelect'
import { Modal } from './Modal'

type LanguageDialogProps = {
  file: File
  lang: string
  onLangChange: (code: string) => void
  onConfirm: () => void
  onClose: () => void
}

export function LanguageDialog({ file, lang, onLangChange, onConfirm, onClose }: LanguageDialogProps) {
  return (
    <Modal label="Select a language" onClose={onClose}>
      <div className="modal-banner">
        <div className="doc-pair" aria-hidden="true">
          <span className="doc doc-source">
            <i />
            <i />
            <i />
          </span>
          <span className="doc-arrow">→</span>
          <span className="doc doc-target">
            <i />
            <i />
            <i />
          </span>
        </div>
        <h2>Select a language</h2>
        <p className="file-chip">
          <strong>{file.name}</strong>
          <span>{formatSize(file.size)}</span>
        </p>
      </div>
      <div className="modal-body">
        <p className="field-label">Translate the file into…</p>
        <LanguageSelect value={lang} onChange={onLangChange} />
        <button type="button" className="button primary" onClick={onConfirm}>
          Translate
        </button>
      </div>
    </Modal>
  )
}

type ProgressDialogProps = {
  fileName: string
  languageName: string
  uploaded: boolean
}

export function ProgressDialog({ fileName, languageName, uploaded }: ProgressDialogProps) {
  const steps = [
    { label: 'Uploading the file', state: uploaded ? 'done' : 'active' },
    { label: `Translating into ${languageName}`, state: uploaded ? 'active' : 'pending' },
    { label: 'Preparing your download', state: 'pending' },
  ]

  return (
    <Modal label="Translation in progress">
      <div className="modal-body centered">
        <div className="ring">
          <span className="ring-icon">
            <SlidesIcon />
          </span>
        </div>
        <h2>Translation in progress…</h2>
        <p className="file-name">{fileName}</p>
        <ul className="steps">
          {steps.map((step) => (
            <li key={step.label} className={`step ${step.state}`}>
              <span className="step-mark">{step.state === 'done' && <CheckIcon />}</span>
              {step.label}
            </li>
          ))}
        </ul>
        <p className="muted">Large files can take a minute. Keep this tab open.</p>
      </div>
    </Modal>
  )
}

type DoneDialogProps = {
  fileName: string
  languageName: string
  onDownload: () => void
  onReset: () => void
}

export function DoneDialog({ fileName, languageName, onDownload, onReset }: DoneDialogProps) {
  return (
    <Modal label="Translation finished" onClose={onReset}>
      <div className="modal-body centered">
        <div className="result-mark success">
          <CheckIcon />
        </div>
        <h2>Done</h2>
        <p className="muted">Your file has been translated into {languageName}.</p>
        <button type="button" className="button primary" onClick={onDownload}>
          Download {fileName}
        </button>
        <button type="button" className="button ghost" onClick={onReset}>
          Translate another
        </button>
      </div>
    </Modal>
  )
}

type ErrorDialogProps = {
  message: string
  onRetry: () => void
  onReset: () => void
}

export function ErrorDialog({ message, onRetry, onReset }: ErrorDialogProps) {
  return (
    <Modal label="Translation failed" onClose={onReset}>
      <div className="modal-body centered">
        <div className="result-mark failure">
          <AlertIcon />
        </div>
        <h2>Translation failed</h2>
        <p className="error-text" role="alert">
          {message}
        </p>
        <button type="button" className="button primary" onClick={onRetry}>
          Try again
        </button>
        <button type="button" className="button ghost" onClick={onReset}>
          Choose another file
        </button>
      </div>
    </Modal>
  )
}
