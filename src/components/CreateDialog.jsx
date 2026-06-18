import { useState } from 'react'
import { File, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export default function CreateDialog({ currentPath, onClose, onSuccess, defaultType }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [type, setType] = useState(defaultType === 'folder' ? 'directory' : 'file')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCreate = async () => {
    if (!name.trim()) {
      setError(t('nameRequired'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPath,
          name: name.trim(),
          type,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('createFailed'))
        return
      }

      const label = type === 'directory' ? t('folder') : t('file')
      showToast(t('createSuccess'), 'success', t('createSuccessDesc', { type: label, name: name.trim() }))
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogPopup showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('createTitle')}</DialogTitle>
          <DialogDescription>
            {t('createDescription', { path: currentPath })}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-4">
            <Input
              placeholder={t('createNamePlaceholder')}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />

            <div className="flex gap-2">
              <button
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  type === 'file'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent'
                }`}
                onClick={() => setType('file')}
              >
                <File className="size-4" />
                {t('fileType')}
              </button>
              <button
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  type === 'directory'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent'
                }`}
                onClick={() => setType('directory')}
              >
                <FolderOpen className="size-4" />
                {t('folderType')}
              </button>
            </div>

            {error && (
              <p className="text-destructive text-xs">{error}</p>
            )}
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>
            {t('cancel')}
          </DialogClose>
          <Button onClick={handleCreate} loading={loading}>
            {t('create')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  )
}
