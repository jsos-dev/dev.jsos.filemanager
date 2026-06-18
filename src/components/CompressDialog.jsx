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

export default function CompressDialog({ currentPath, file, existingFiles, onClose, onSuccess }) {
  const { t } = useI18n()
  const isBatch = file.isBatch
  const defaultName = file.name + (file.name.endsWith('.zip') ? '' : '.zip')
  const [zipName, setZipName] = useState(defaultName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const paths = isBatch ? file.paths : [
    currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`
  ]
  const zipPath = currentPath === '/' ? `/${zipName}` : `${currentPath}/${zipName}`
  const alreadyExists = existingFiles?.some((f) => f.name === zipName && !f.isDirectory)

  const handleCompress = async () => {
    if (!zipName.trim()) {
      setError(t('nameRequired'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(isBatch ? '/api/files/batch-compress' : '/api/files/compress', {
        method: isBatch ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paths,
          destDir: currentPath,
          zipName: zipName.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('compressFailed'))
        return
      }

      showToast(t('compressSuccess'), 'success', t('compressSuccessDesc', { name: zipName.trim() }))
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
          <DialogTitle>{t('compressTitle')}</DialogTitle>
          <DialogDescription>
            {t('compressDescription', { name: file.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('archiveName')}</label>
              <Input
                value={zipName}
                onChange={(e) => {
                  setZipName(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleCompress()}
                autoFocus
              />
            </div>

            {alreadyExists && (
              <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-2.5">
                <AlertTriangle className="size-4 text-warning shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {t('compressOverwriteWarning', { name: zipName })}
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
          <Button onClick={handleCompress} loading={loading}>
            {alreadyExists ? t('overwriteCompress') : t('compress')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  )
}
