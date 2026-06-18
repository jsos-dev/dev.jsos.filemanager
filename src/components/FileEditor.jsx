import { useState, useEffect, useCallback, useMemo } from 'react'
import { X, Save, FileText, FileImage, Loader2, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import { useI18n } from '@/i18n'

function getLanguageExtension(filename) {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return [javascript()]
    case 'ts':
    case 'tsx':
      return [javascript({ typescript: true })]
    case 'json':
    case 'jsonc':
      return [json()]
    case 'html':
    case 'htm':
    case 'vue':
    case 'svelte':
      return [html()]
    case 'css':
    case 'scss':
    case 'less':
      return [css()]
    case 'py':
    case 'pyw':
      return [python()]
    default:
      return []
  }
}

export default function FileEditor({ file, onClose, onSave, width, isDark }) {
  const { t } = useI18n()
  const [content, setContent] = useState(null)
  const [originalContent, setOriginalContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [isBinary, setIsBinary] = useState(false)

  const hasChanges = content !== originalContent
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico']
  const isImageFile = imageExts.includes(file.name.split('.').pop()?.toLowerCase())
  const extensions = useMemo(() => getLanguageExtension(file.name), [file.name])

  useEffect(() => {
    let cancelled = false

    async function loadContent() {
      setLoading(true)
      setError(null)
      setContent(null)
      setOriginalContent(null)
      setIsBinary(false)

      try {
        const res = await fetch(`/api/files/content?path=${encodeURIComponent(file.path)}`)
        if (!res.ok) throw new Error('Failed to load file')
        const data = await res.json()
        if (!cancelled) {
          if (data.isBinary) {
            setIsBinary(true)
            setContent(null)
            setOriginalContent(null)
          } else {
            setContent(data.content || '')
            setOriginalContent(data.content || '')
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

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (hasChanges && !saving) {
          handleSave()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasChanges, saving, content])

  const handleSave = useCallback(async () => {
    if (!hasChanges || saving) return

    setSaving(true)
    setSaveStatus(null)

    try {
      const res = await fetch('/api/files/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: file.path, content }),
      })

      if (!res.ok) throw new Error('Failed to save file')

      setOriginalContent(content)
      setSaveStatus('success')
      onSave?.(file.path)

      setTimeout(() => setSaveStatus(null), 2000)
    } catch (err) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    } finally {
      setSaving(false)
    }
  }, [content, originalContent, hasChanges, saving, file.path, onSave])

  const codeMirrorTheme = isDark ? oneDark : undefined

  return (
    <div
      className="flex flex-col border-l bg-card shrink-0 min-w-[300px]"
      style={{ width: `${width}%` }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="flex items-center gap-2 text-sm font-medium truncate">
          <FileText className="size-4 shrink-0" />
          <span className="truncate">{file.name}</span>
          {hasChanges && (
            <span className="size-2 rounded-full bg-warning shrink-0" title={t('unsavedChanges')} />
          )}
        </span>

        <div className="flex items-center gap-1">
          {saveStatus === 'success' && (
            <span className="flex items-center gap-1 text-xs text-success mr-2">
              <Check className="size-3.5" />
              {t('saved')}
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-xs text-destructive mr-2">
              <AlertCircle className="size-3.5" />
              {t('error')}
            </span>
          )}

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            aria-label={t('saveFile')}
          >
            {saving ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save />
            )}
          </Button>

          <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label={t('closeEditor')}>
            <X />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive text-sm">
            <AlertCircle className="size-8" />
            <span>{error}</span>
          </div>
        ) : isBinary && isImageFile ? (
          <div className="flex items-center justify-center h-full p-4">
            <img
              src={`/api/files/raw?path=${encodeURIComponent(file.path)}`}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            <div className="hidden flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
              <FileImage className="size-12 opacity-40" />
              <span>{t('previewLoadError')}</span>
            </div>
          </div>
        ) : isBinary ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground text-sm">
            <FileText className="size-12 opacity-40" />
            <span>{t('binaryFile')}</span>
            <span className="text-xs">{file.path}</span>
          </div>
        ) : (
          <CodeMirror
            value={content || ''}
            onChange={(value) => setContent(value)}
            extensions={[...extensions, EditorView.lineWrapping]}
            theme={codeMirrorTheme}
            height="100%"
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: false,
              indentOnInput: true,
            }}
          />
        )}
      </div>
    </div>
  )
}
