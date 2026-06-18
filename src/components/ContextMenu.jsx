import { useEffect, useRef, useMemo } from 'react'
import {
  FolderOpen,
  Eye,
  Pencil,
  Trash2,
  Download,
  Archive,
  ArchiveRestore,
  Copy,
  Scissors,
  Clipboard,
  CheckSquare,
  Square,
  Upload,
  Plus,
  FolderPlus,
  RefreshCw,
  FileText,
} from 'lucide-react'
import { useI18n } from '@/i18n'

export default function ContextMenu({
  x,
  y,
  file,
  isBackground,
  onClose,
  onOpen,
  onPreview,
  onRename,
  onDelete,
  onDownload,
  onCompress,
  onDecompress,
  onCopy,
  onCut,
  onPaste,
  onSelectAll,
  onInvertSelection,
  onUpload,
  onCreateFile,
  onCreateFolder,
  onRefresh,
  hasClipboard,
  selectedCount,
  hasFiles,
}) {
  const { t } = useI18n()
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose()
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // 右键菜单边界修正：防止菜单超出视口
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const rect = el.getBoundingClientRect()
    const updates = {}
    if (rect.right > window.innerWidth) updates.left = window.innerWidth - rect.width - 8
    if (rect.bottom > window.innerHeight) updates.top = window.innerHeight - rect.height - 8
    if (updates.left !== undefined || updates.top !== undefined) {
      el.style.left = `${updates.left ?? x}px`
      el.style.top = `${updates.top ?? y}px`
    }
  }, [x, y])

  const menuItems = useMemo(() => {
    // 多选模式：只显示批量操作
    if (!isBackground && selectedCount > 1) {
      return [
        { icon: <Copy className="size-4" />, label: t('copy'), action: onCopy },
        { icon: <Scissors className="size-4" />, label: t('cut'), action: onCut },
        { type: 'separator' },
        { icon: <Archive className="size-4" />, label: t('compress'), action: onCompress },
        { type: 'separator' },
        {
          icon: <Trash2 className="size-4" />,
          label: t('delete'),
          action: onDelete,
          destructive: true,
        },
      ]
    }

    // 空白处右键菜单
    if (isBackground) {
      const items = [
        { icon: <Upload className="size-4" />, label: t('uploadLabel'), action: onUpload },
        { icon: <FileText className="size-4" />, label: t('newFile'), action: onCreateFile },
        { icon: <FolderPlus className="size-4" />, label: t('newFolder'), action: onCreateFolder },
        { icon: <RefreshCw className="size-4" />, label: t('refreshLabel'), action: onRefresh },
      ]
      if (hasFiles) {
        items.push({ type: 'separator' })
        items.push({
          icon: <CheckSquare className="size-4" />,
          label: t('selectAll'),
          action: onSelectAll,
        })
        items.push({
          icon: <Square className="size-4" />,
          label: t('invertSelection'),
          action: onInvertSelection,
        })
      }
      if (hasClipboard) {
        items.push({ type: 'separator' })
        items.push({
          icon: <Clipboard className="size-4" />,
          label: t('paste'),
          action: onPaste,
        })
      }
      return items
    }

    // 单文件/文件夹右键菜单
    const isZip = !file.isDirectory && file.name.toLowerCase().endsWith('.zip')

    const items = file.isDirectory
      ? [
          { icon: <FolderOpen className="size-4" />, label: t('open'), action: onOpen },
          { type: 'separator' },
          { icon: <Copy className="size-4" />, label: t('copy'), action: onCopy },
          { icon: <Scissors className="size-4" />, label: t('cut'), action: onCut },
        ]
      : isZip
        ? [
            { icon: <Eye className="size-4" />, label: t('preview'), action: onPreview },
            { icon: <ArchiveRestore className="size-4" />, label: t('decompress'), action: onDecompress },
            { type: 'separator' },
            { icon: <Copy className="size-4" />, label: t('copy'), action: onCopy },
            { icon: <Scissors className="size-4" />, label: t('cut'), action: onCut },
          ]
        : [
            { icon: <Eye className="size-4" />, label: t('preview'), action: onPreview },
            { icon: <Copy className="size-4" />, label: t('copy'), action: onCopy },
            { icon: <Scissors className="size-4" />, label: t('cut'), action: onCut },
          ]

    // 剪贴板有内容时追加粘贴
    if (hasClipboard) {
      items.push({
        icon: <Clipboard className="size-4" />,
        label: t('paste'),
        action: onPaste,
      })
    }

    // 下载/压缩
    items.push({ type: 'separator' })
    if (file.isDirectory) {
      items.push({ icon: <Download className="size-4" />, label: t('downloadAsZip'), action: onDownload })
    } else {
      items.push({ icon: <Download className="size-4" />, label: t('download'), action: onDownload })
    }
    items.push({ icon: <Archive className="size-4" />, label: t('compress'), action: onCompress })

    // 重命名 + 删除
    items.push({ type: 'separator' })
    items.push({ icon: <Pencil className="size-4" />, label: t('rename'), action: onRename })
    items.push({
      icon: <Trash2 className="size-4" />,
      label: t('delete'),
      action: onDelete,
      destructive: true,
    })

    return items
  }, [isBackground, file, hasClipboard, selectedCount, hasFiles, t, onOpen, onPreview, onRename, onDelete, onDownload, onCompress, onDecompress, onCopy, onCut, onPaste, onSelectAll, onInvertSelection, onUpload, onCreateFile, onCreateFolder, onRefresh])

  if (menuItems.length === 0) return null

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-36 rounded-lg border bg-popover shadow-lg/5"
      style={{ left: x, top: y }}
    >
      <div className="p-1">
        {menuItems.map((item, i) =>
          item.type === 'separator' ? (
            <div key={i} className="mx-2 my-1 h-px bg-border" />
          ) : (
            <button
              key={i}
              className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent ${
                item.destructive
                  ? 'text-destructive hover:text-destructive'
                  : 'text-foreground'
              }`}
              onClick={() => {
                item.action()
                onClose()
              }}
            >
              {item.icon}
              {item.label}
            </button>
          )
        )}
      </div>
    </div>
  )
}
