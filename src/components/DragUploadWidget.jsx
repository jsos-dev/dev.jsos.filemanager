import { useState, useRef, useCallback } from 'react'
import { Upload as UploadIcon, CheckCircle, AlertCircle } from 'lucide-react'
import { useI18n } from '@/i18n'

export default function DragUploadWidget() {
  const { t } = useI18n()
  const [state, setState] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [uploadedCount, setUploadedCount] = useState(0)
  const inputRef = useRef(null)
  const dragOverCount = useRef(0)

  const reset = useCallback(() => {
    setState('idle')
    setProgress(0)
    setUploadedCount(0)
  }, [])

  const uploadFiles = useCallback(async (files) => {
    if (files.length === 0) return

    setState('uploading')
    setProgress(0)

    try {
      const configRes = await fetch('/api/config')
      const config = await configRes.json()
      const dirPath = config.defaultPath || '/'

      const formData = new FormData()
      formData.append('path', dirPath)
      for (const file of files) {
        formData.append('files', file)
      }

      const xhr = new XMLHttpRequest()

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100))
        }
      }

      await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error('Upload failed'))
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.open('POST', '/api/files/upload', true)
        xhr.send(formData)
      })

      setUploadedCount(files.length)
      setState('success')
      setTimeout(reset, 2500)
    } catch {
      setState('error')
      setTimeout(reset, 2000)
    }
  }, [reset])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    dragOverCount.current = 0
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) uploadFiles(files)
  }, [uploadFiles])

  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    dragOverCount.current++
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    dragOverCount.current--
  }, [])

  const handleClick = useCallback(() => {
    if (state !== 'idle' && state !== 'success' && state !== 'error') return
    inputRef.current?.click()
  }, [state])

  const handleFileChange = useCallback((e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) uploadFiles(files)
    e.target.value = ''
  }, [uploadFiles])

  return (
    <div
      className="flex flex-col h-full p-2 select-none"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <div
        onClick={handleClick}
        className={[
          'flex-1 flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed transition-all duration-150 cursor-pointer min-h-0 p-2',
          state === 'uploading' ? 'border-muted-foreground/30 pointer-events-none opacity-70' : '',
          state === 'idle' ? 'border-border hover:border-muted-foreground/50 hover:bg-accent/30' : '',
          state === 'success' ? 'border-success bg-success/10 border-solid' : '',
          state === 'error' ? 'border-destructive bg-destructive/10 border-solid' : '',
        ].filter(Boolean).join(' ')}
      >
        {state === 'idle' && (
          <>
            <UploadIcon className="size-5 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5" />
            <span className="text-[10px] text-center leading-relaxed text-muted-foreground">
              {t('widgetDropHint')}
            </span>
          </>
        )}

        {state === 'uploading' && (
          <div className="flex flex-col items-center gap-1.5 w-full max-w-32">
            <UploadIcon className="size-5 text-muted-foreground animate-pulse" />
            <div className="w-full h-1 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground">
              {t('widgetUploadProgress', { pct: progress })}
            </span>
          </div>
        )}

        {state === 'success' && (
          <div className="flex flex-col items-center gap-1">
            <CheckCircle className="size-5 text-success" />
            <span className="text-[10px] text-center text-success leading-relaxed">
              {t('widgetUploadSuccess', { n: uploadedCount })}
            </span>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-1">
            <AlertCircle className="size-5 text-destructive" />
            <span className="text-[10px] text-center text-destructive leading-relaxed">
              {t('widgetUploadFailed')}
            </span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
