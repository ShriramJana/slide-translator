import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { PlusIcon } from './icons'

type DropzoneProps = {
  onFile: (file: File) => void
}

export function Dropzone({ onFile }: DropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    // lets the same file be picked again after an error
    e.target.value = ''
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  return (
    <div className="dropzone-frame">
      <div
        className={dragging ? 'dropzone dragging' : 'dropzone'}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
      >
        <input ref={inputRef} type="file" accept=".pptx" hidden onChange={handleChange} />
        <button type="button" className="dropzone-button" aria-label="Choose a .pptx file">
          <span>
            <PlusIcon />
          </span>
        </button>
        <p className="dropzone-title">{dragging ? 'Drop it to upload' : 'Or drop your .pptx here'}</p>
        <p className="dropzone-hint">PowerPoint only · Maximum file size: 10 MB</p>
      </div>
    </div>
  )
}
