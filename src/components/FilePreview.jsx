import { useState, useEffect } from 'react'
import { X, File, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useI18n } from '@/i18n'

function formatSize(bytes) {
  if (bytes == null) return '-'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString()
}

export default function FilePreview({ file, onClose }) {
  const { t } = useI18n()
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadContent() {
      setLoading(true)
      setError(null)
      setContent(null)

      try {
        const res = await fetch(`/api/files/content?path=${encodeURIComponent(file.path)}`)
        if (!res.ok) throw new Error('Failed to load file')
        const data = await res.json()
        if (!cancelled) {
          if (data.isBinary) {
            setContent({ type: 'binary', size: data.size, mtime: data.mtime })
          } else {
            setContent({ type: 'text', content: data.content, size: data.size, mtime: data.mtime })
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadContent()
    return () => { cancelled = true }
  }, [file.path])

  return (
    <div className="flex flex-col border-l bg-card w-80 shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="flex items-center gap-2 text-sm font-medium truncate">
          <FileText className="size-4 shrink-0" />
          <span className="truncate">{file.name}</span>
        </span>
        <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label={t('closePreview')}>
          <X />
        </Button>
      </div>

      <Separator />

      <div className="flex-1 min-h-0 overflow-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-destructive text-xs">{error}</div>
        ) : content?.type === 'binary' ? (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <File className="size-8" />
              <span>{t('previewBinaryFile')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-muted-foreground">{t('previewSize')}</span>
              <span>{formatSize(content.size)}</span>
              <span className="text-muted-foreground">{t('previewModified')}</span>
              <span>{formatDate(content.mtime)}</span>
            </div>
          </div>
        ) : content?.type === 'text' ? (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-2">
              <span>{t('previewSize')} {formatSize(content.size)}</span>
              <span>{t('previewModified')} {formatDate(content.mtime)}</span>
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground/80 rounded-lg bg-background/50 p-3 overflow-auto max-h-[calc(100vh-12rem)]">
              {content.content || t('emptyFile')}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  )
}
