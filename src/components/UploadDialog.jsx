import { useState, useRef } from 'react'
import { Upload, X, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { showToast } from '@/lib/toast'
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

export default function UploadDialog({ currentPath, onClose, onSuccess }) {
  const { t } = useI18n()
  const [selectedFiles, setSelectedFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    setSelectedFiles((prev) => [...prev, ...files])
    setError(null)
    e.target.value = ''
  }

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError(t('uploadSelectFiles'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('path', currentPath)
      for (const file of selectedFiles) {
        formData.append('files', file)
      }

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('uploadFailed'))
        return
      }

      showToast(t('uploadSuccess'), 'success', t('uploadSuccessDesc', { count: selectedFiles.length }))
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogPopup showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('uploadTitle')}</DialogTitle>
          <DialogDescription>
            {t('uploadDescription', { path: currentPath })}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-4">
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50 hover:bg-accent/30 cursor-pointer"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.classList.add('border-primary', 'bg-accent/30')
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('border-primary', 'bg-accent/30')
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.classList.remove('border-primary', 'bg-accent/30')
                const files = Array.from(e.dataTransfer.files)
                setSelectedFiles((prev) => [...prev, ...files])
                setError(null)
              }}
            >
              <Upload className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('uploadDropHint')}
              </p>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {selectedFiles.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center gap-2 rounded-md bg-accent/30 px-2 py-1.5 text-sm"
                  >
                    <File className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatSize(file.size)}
                    </span>
                    <button
                      onClick={() => removeFile(i)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-1">
                  {t('uploadSummary', { count: selectedFiles.length, total: formatSize(totalSize) })}
                </p>
              </div>
            )}

            {error && (
              <p className="text-destructive text-xs">{error}</p>
            )}
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>
            {t('cancel')}
          </DialogClose>
          <Button onClick={handleUpload} loading={loading}>
            {t('upload')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  )
}
