import { useState, useEffect } from 'react'
import { FolderOpen } from 'lucide-react'
import { useI18n } from '@/i18n'

function formatSize(bytes) {
  if (bytes == null || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

export default function DiskInfoWidget() {
  const { t } = useI18n()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      setLoading(true)
      setError(null)
      try {
        const configRes = await fetch('/api/config')
        const config = await configRes.json()
        const dirPath = config.defaultPath || '/'
        const res = await fetch(`/api/files/stats?path=${encodeURIComponent(dirPath)}`)
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        if (!cancelled) setStats(data)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStats()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex flex-col h-full p-2 select-none">
      <div className="flex items-center gap-1.5 pb-1 shrink-0">
        <FolderOpen className="size-3.5 text-warning shrink-0" />
        <span className="text-[11px] font-semibold leading-tight text-foreground">
          {t('widgetSharedData')}
        </span>
      </div>

      <div className="flex-1 flex items-center min-h-0">
        {loading ? (
          <div className="flex items-center justify-center w-full gap-1.5 text-muted-foreground text-[11px]">
            <span className="size-3 rounded-full border border-border border-t-foreground animate-spin" />
            <span>{t('widgetLoading')}</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center w-full text-destructive text-[11px]">
            {t('widgetError')}
          </div>
        ) : stats ? (
          <div className="flex items-center w-full gap-0.5">
            <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 rounded-md min-w-0">
              <span className="text-base font-bold leading-none text-info tabular-nums">
                {stats.fileCount}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                {t('widgetFiles')}
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 rounded-md min-w-0">
              <span className="text-base font-bold leading-none text-warning tabular-nums">
                {stats.dirCount}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                {t('widgetDirs')}
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 rounded-md min-w-0">
              <span className="text-base font-bold leading-none text-success tabular-nums">
                {formatSize(stats.totalSize)}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                {t('widgetSize')}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
