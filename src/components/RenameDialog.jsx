import { useState } from 'react'
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

export default function RenameDialog({ currentPath, file, onClose, onSuccess }) {
  const { t } = useI18n()
  const [name, setName] = useState(file.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleRename = async () => {
    if (!name.trim()) {
      setError(t('nameRequired'))
      return
    }

    if (name.trim() === file.name) {
      onClose()
      return
    }

    setLoading(true)
    setError(null)

    try {
      const oldPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`
      const newPath = currentPath === '/' ? `/${name.trim()}` : `${currentPath}/${name.trim()}`

      const res = await fetch('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('renameFailed'))
        return
      }

      showToast(t('renameSuccess'), 'success', t('renameSuccessDesc', { name: name.trim() }))
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
          <DialogTitle>{t('renameTitle')}</DialogTitle>
          <DialogDescription>
            {t('renameDescription', { name: file.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-4">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              autoFocus
            />
            {error && (
              <p className="text-destructive text-xs">{error}</p>
            )}
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>
            {t('cancel')}
          </DialogClose>
          <Button onClick={handleRename} loading={loading}>
            {t('rename')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  )
}
