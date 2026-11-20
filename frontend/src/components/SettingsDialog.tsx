import { useState } from 'react'
import type { FormEvent } from 'react'
import { checkKey, getSavedKey, saveKey } from '../api'
import { Modal } from './Modal'

type SettingsDialogProps = {
  onClose: () => void
  onChanged: () => void
}

type Notice = {
  text: string
  failed: boolean
}

export function SettingsDialog({ onClose, onChanged }: SettingsDialogProps) {
  const [key, setKey] = useState(getSavedKey)
  const [hasSavedKey, setHasSavedKey] = useState(() => getSavedKey() !== '')
  const [checking, setChecking] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = key.trim()
    if (!trimmed) return
    setChecking(true)
    setNotice(null)
    try {
      const usage = await checkKey(trimmed)
      saveKey(trimmed)
      setHasSavedKey(true)
      const used = usage.used.toLocaleString()
      const quota = usage.limit ? ` of ${usage.limit.toLocaleString()}` : ''
      setNotice({ text: `Key saved. ${used}${quota} characters used so far.`, failed: false })
      onChanged()
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : 'Could not check the key.', failed: true })
    } finally {
      setChecking(false)
    }
  }

  function handleRemove() {
    saveKey('')
    setKey('')
    setHasSavedKey(false)
    setNotice({ text: 'Key removed from this browser.', failed: false })
    onChanged()
  }

  return (
    <Modal label="Settings" onClose={onClose}>
      <form className="modal-body" onSubmit={handleSubmit}>
        <h2>Settings</h2>
        <label className="field-label" htmlFor="deepl-key">
          DeepL API key
        </label>
        <input
          id="deepl-key"
          className="text-input"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste your key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <p className="muted">
          The key is saved in this browser only. It is sent with each translation so the server can call DeepL, and it
          is not stored there. Without a key the app runs in mock mode and only tags the text.
        </p>
        <p className="muted">
          Get a key from your{' '}
          <a href="https://www.deepl.com/your-account/keys" target="_blank" rel="noreferrer">
            DeepL account
          </a>
          .
        </p>
        {notice && (
          <p className={notice.failed ? 'error-text' : 'success-text'} role="status">
            {notice.text}
          </p>
        )}
        <button type="submit" className="button primary" disabled={checking || !key.trim()}>
          {checking ? 'Checking…' : 'Save key'}
        </button>
        {hasSavedKey && (
          <button type="button" className="button ghost" onClick={handleRemove}>
            Remove key
          </button>
        )}
      </form>
    </Modal>
  )
}
