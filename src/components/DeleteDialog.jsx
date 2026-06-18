import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
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

export default function DeleteDialog({ currentPath, file, onClose, onSuccess }) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)

    try {
      const filePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`

      const res = await fetch(`/api/files?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('deleteFailed'))
        return
      }

      showToast(t('deleteSuccess'), 'success', t('deleteSuccessDesc', { name: file.name }))
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
          <DialogTitle>{file.isDirectory ? t('deleteTitleFolder') : t('deleteTitleFile')}</DialogTitle>
          <DialogDescription>
            {t('deleteDescription', { name: file.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
            <AlertTriangle className="size-5 text-warning shrink-0" />
            <p className="text-sm text-muted-foreground">
              {file.isDirectory
                ? t('deleteFolderWarning')
                : t('deleteFileWarning')}
            </p>
          </div>
          {error && (
            <p className="mt-3 text-destructive text-xs">{error}</p>
          )}
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>
            {t('cancel')}
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete} loading={loading}>
            {t('delete')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  )
}
