import { FolderTree, HardDrive, PanelLeftClose, PanelLeft } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import DirectoryTree from './DirectoryTree'
import { useI18n } from '@/i18n'

export default function Sidebar({ currentPath, onNavigate, collapsed, onToggleCollapse, width }) {
  const { t } = useI18n()

  if (collapsed) {
    return (
      <div className="flex flex-col border-r border-border bg-card w-10 shrink-0">
        <div className="flex items-center justify-center py-2 border-b border-border">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onToggleCollapse}
            aria-label={t('expandSidebar')}
            title={t('expandSidebar')}
          >
            <PanelLeft className="size-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col border-r border-border bg-card shrink-0"
      style={{ width: `${width}px` }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <HardDrive className="size-4" />
          {t('explorer')}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onToggleCollapse}
          aria-label={t('collapseSidebar')}
          title={t('collapseSidebar')}
        >
          <PanelLeftClose className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <DirectoryTree currentPath={currentPath} onNavigate={onNavigate} />
      </ScrollArea>

      <div className="px-3 py-2 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FolderTree className="size-3.5" />
          <span className="truncate" title={currentPath}>
            {currentPath === null ? t('loading') : currentPath === '/' ? t('root') : currentPath.split('/').pop()}
          </span>
        </div>
      </div>
    </div>
  )
}
