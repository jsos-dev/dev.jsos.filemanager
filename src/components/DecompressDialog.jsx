import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
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

export default function DecompressDialog({ currentPath, file, existingFiles, onClose, onSuccess }) {
  const { t } = useI18n()
  const folderName = file.name.replace(/\.zip$/i, '')
  const defaultDest = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`
  const [destName, setDestName] = useState(folderName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const zipPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`
  const destDir = currentPath === '/' ? `/${destName}` : `${currentPath}/${destName}`
  const alreadyExists = existingFiles?.some((f) => f.name === destName && f.isDirectory)

  const handleDecompress = async () => {
    if (!destName.trim()) {
      setError(t('destNameRequired'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/files/decompress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipPath, destDir }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('decompressFailed'))
        return
      }

      showToast(t('decompressSuccess'), 'success', t('decompressSuccessDesc', { name: destName }))
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
          <DialogTitle>{t('decompressTitle')}</DialogTitle>
          <DialogDescription>
            {t('decompressDescription', { name: file.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('destFolder')}</label>
              <Input
                value={destName}
                onChange={(e) => {
                  setDestName(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleDecompress()}
                autoFocus
              />
            </div>

            {alreadyExists && (
              <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-2.5">
                <AlertTriangle className="size-4 text-warning shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {t('decompressMergeWarning', { name: destName })}
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
          <Button onClick={handleDecompress} loading={loading}>
            {t('decompress')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  )
}
