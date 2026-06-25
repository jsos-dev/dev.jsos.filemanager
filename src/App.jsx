import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FolderOpen,
  File,
  FileText,
  FileCode,
  FileImage,
  FileArchive,
  RefreshCw,
  Plus,
  Home,
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Upload,
  Terminal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '@/components/ui/breadcrumb'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'
import ContextMenu from '@/components/ContextMenu'
import CreateDialog from '@/components/CreateDialog'
import RenameDialog from '@/components/RenameDialog'
import DeleteDialog from '@/components/DeleteDialog'
import UploadDialog from '@/components/UploadDialog'
import CompressDialog from '@/components/CompressDialog'
import DecompressDialog from '@/components/DecompressDialog'
import Sidebar from '@/components/Sidebar'
import FileEditor from '@/components/FileEditor'
import ResizableDivider from '@/components/ResizableDivider'
import DiskInfoWidget from '@/components/DiskInfoWidget'
import DragUploadWidget from '@/components/DragUploadWidget'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useI18n } from '@/i18n'
import { showToast } from '@/lib/toast'

function getFileIcon(entry) {
  if (entry.isDirectory) return <FolderOpen className="size-4 text-warning" />

  const ext = entry.name.split('.').pop()?.toLowerCase()
  if (['js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css'].includes(ext))
    return <FileCode className="size-4 text-info" />
  if (['md', 'txt', 'log'].includes(ext))
    return <FileText className="size-4 text-muted-foreground" />
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext))
    return <FileImage className="size-4 text-success" />
  if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext))
    return <FileArchive className="size-4 text-warning" />
  return <File className="size-4 text-muted-foreground" />
}

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
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function App() {
  const { t } = useI18n()
  const [route, setRoute] = useState(() => {
    const hash = window.location.hash
    if (hash.startsWith('#/widget/')) return 'widget'
    return 'browser'
  })
  const [currentPath, setCurrentPath] = useState(() => {
    const hash = window.location.hash.replace(/^#/, '')
    if (hash.startsWith('widget/')) return null
    return hash || null
  })
  const [files, setFiles] = useState([])
  const [parent, setParent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState(new Set())
  const [clipboard, setClipboard] = useState({ files: [], mode: null }) // mode: 'copy' | 'cut'
  const [contextMenu, setContextMenu] = useState(null)
  const [dragOverFolder, setDragOverFolder] = useState(null)
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [editingFile, setEditingFile] = useState(null)
  const [dialogState, setDialogState] = useState({ type: null, file: null })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(208)
  const [editorWidth, setEditorWidth] = useState(50)
  const [isDark, setIsDark] = useState(true)
  const isMobile = useMediaQuery('(hover: none) and (pointer: coarse)')

  useEffect(() => {
    async function init() {
      try {
        const mode = await window.JSOS?.getTheme()
        const effective = mode === 'dark' || mode === 'light' ? mode : 'dark'
        setIsDark(effective === 'dark')
        document.documentElement.classList.toggle('dark', effective === 'dark')
      } catch (e) {}
    }
    init()
    const unsub = window.JSOS?.onThemeChange?.(mode => {
      const effective = mode === 'dark' || mode === 'light' ? mode : 'dark'
      setIsDark(effective === 'dark')
      document.documentElement.classList.toggle('dark', effective === 'dark')
    })
    return () => unsub?.()
  }, [])

  const loadFiles = useCallback(async (path) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`)
      if (!res.ok) throw new Error('Failed to load directory')
      const data = await res.json()
      setFiles(data.entries)
      setParent(data.parent)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '')
    if (!hash && route === 'browser') {
      fetch('/api/config')
        .then((res) => res.json())
        .then((data) => setCurrentPath(data.defaultPath))
        .catch(() => setCurrentPath('/'))
    }
  }, [route])

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash
      if (hash.startsWith('#/widget/')) {
        setRoute('widget')
      } else {
        setRoute('browser')
        const path = hash.replace(/^#/, '') || '/'
        setCurrentPath(path)
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (route === 'widget') {
      document.body.classList.add('widget-mode')
      return () => document.body.classList.remove('widget-mode')
    }
  }, [route])

  useEffect(() => {
    if (currentPath !== null) {
      loadFiles(currentPath)
    }
  }, [currentPath, loadFiles])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/files/search?path=${encodeURIComponent(currentPath)}&q=${encodeURIComponent(searchQuery)}`
        )
        if (!res.ok) return
        const data = await res.json()
        setSearchResults(data.results)
      } catch {
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, currentPath])

  const navigateTo = useCallback((path) => {
    window.location.hash = path
    setCurrentPath(path)
    setSelectedFile(null)
    setSearchQuery('')
    setSearchResults(null)
    setEditingFile(null)
  }, [])

  const displayFiles = searchResults || files

  const sortedFiles = [...displayFiles].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1

    let cmp = 0
    switch (sortBy) {
      case 'name':
        cmp = a.name.localeCompare(b.name)
        break
      case 'size':
        cmp = (a.size || 0) - (b.size || 0)
        break
      case 'mtime':
        cmp = (a.mtime || '').localeCompare(b.mtime || '')
        break
      default:
        cmp = a.name.localeCompare(b.name)
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const getFullPath = useCallback(
    (name) => (currentPath === '/' ? `/${name}` : `${currentPath}/${name}`),
    [currentPath]
  )

  const handleFileClick = useCallback((e, entry) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedFiles((prev) => {
        const next = new Set(prev)
        const name = entry.name
        if (next.has(name)) {
          next.delete(name)
        } else {
          next.add(name)
        }
        return next
      })
      setSelectedFile(entry)
    } else if (e.shiftKey && selectedFile) {
      const fileNames = sortedFiles.map((f) => f.name)
      const startIdx = fileNames.indexOf(selectedFile.name)
      const endIdx = fileNames.indexOf(entry.name)
      if (startIdx !== -1 && endIdx !== -1) {
        const from = Math.min(startIdx, endIdx)
        const to = Math.max(startIdx, endIdx)
        const range = fileNames.slice(from, to + 1)
        setSelectedFiles((prev) => {
          const next = new Set(prev)
          range.forEach((name) => next.add(name))
          return next
        })
      }
      setSelectedFile(entry)
    } else {
      setSelectedFile(entry)
      setSelectedFiles(new Set([entry.name]))
    }
  }, [selectedFile, sortedFiles])

  const handleFileDoubleClick = useCallback(
    (entry) => {
      if (entry.isDirectory) {
        const newPath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`
        navigateTo(newPath)
      } else {
        const fullPath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`
        setEditingFile({ ...entry, path: fullPath })
      }
    },
    [currentPath, navigateTo]
  )

  const handleContextMenu = useCallback((e, entry) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, file: entry })
  }, [])

  const handleSort = useCallback(
    (column) => {
      if (sortBy === column) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortBy(column)
        setSortDir('asc')
      }
    },
    [sortBy]
  )

  const handleRefresh = useCallback(() => {
    loadFiles(currentPath)
  }, [currentPath, loadFiles])

  const handleCreateSuccess = useCallback(() => {
    loadFiles(currentPath)
  }, [currentPath, loadFiles])

  const handleRenameSuccess = useCallback(() => {
    loadFiles(currentPath)
    setSelectedFile(null)
    setEditingFile(null)
  }, [currentPath, loadFiles])

  const handleDeleteSuccess = useCallback(() => {
    loadFiles(currentPath)
    setSelectedFile(null)
    setEditingFile(null)
  }, [currentPath, loadFiles])

  const handleSidebarDrag = useCallback((e) => {
    setSidebarWidth((prev) => {
      const newWidth = prev + e.movementX
      return Math.max(150, Math.min(400, newWidth))
    })
  }, [])

  const handleEditorDrag = useCallback((e) => {
    setEditorWidth((prev) => {
      const containerWidth = window.innerWidth - (sidebarCollapsed ? 40 : sidebarWidth)
      const deltaPercent = (e.movementX / containerWidth) * 100
      const newWidth = prev - deltaPercent
      return Math.max(20, Math.min(70, newWidth))
    })
  }, [sidebarCollapsed, sidebarWidth])

  const handleDownload = useCallback(
    async (entry) => {
      const path = getFullPath(entry.name)
      try {
        const res = await fetch(`/api/files/download?path=${encodeURIComponent(path)}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          showToast(t('downloadFailed'), 'error', data.error || 'Download failed')
          return
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = entry.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        showToast(t('downloadSuccess'), 'success', t('downloadSuccessDesc', { name: entry.name }))
      } catch (err) {
        showToast(t('downloadFailed'), 'error', err.message)
      }
    },
    [getFullPath, t]
  )

  const handleCompress = useCallback(
    (entry) => {
      setDialogState({ type: 'compress', file: entry })
    },
    []
  )

  const handleDecompress = useCallback(
    (entry) => {
      setDialogState({ type: 'decompress', file: entry })
    },
    []
  )

  // 拖拽处理
  const handleDragStart = useCallback(
    (e, entry) => {
      const names = selectedFiles.size > 0 && selectedFiles.has(entry.name)
        ? Array.from(selectedFiles)
        : [entry.name]
      e.dataTransfer.setData('application/json', JSON.stringify({ names, sourcePath: currentPath }))
      e.dataTransfer.effectAllowed = 'move'
    },
    [selectedFiles, currentPath]
  )

  const handleDragOver = useCallback((e, entry) => {
    if (entry.isDirectory) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverFolder(entry.name)
    }
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverFolder(null)
  }, [])

  const handleDrop = useCallback(
    async (e, targetFolder) => {
      e.preventDefault()
      setDragOverFolder(null)

      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'))
        const { names, sourcePath } = data
        const destPath = targetFolder.name
          ? (currentPath === '/' ? `/${targetFolder.name}` : `${currentPath}/${targetFolder.name}`)
          : currentPath
        const sources = names.map((name) =>
          sourcePath === '/' ? `/${name}` : `${sourcePath}/${name}`
        )

        const res = await fetch('/api/files/move', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sources, destDir: destPath }),
        })

        if (!res.ok) throw new Error('Move failed')
        const result = await res.json()

        if (result.errors?.length > 0) {
          showToast(t('moveFailed'), 'error', `${result.errors.length} items failed`)
        } else {
          showToast(t('moveSuccess'), 'success', `${names.length} items moved`)
        }

        setSelectedFiles(new Set())
        loadFiles(currentPath)
      } catch (err) {
        showToast(t('moveFailed'), 'error', err.message)
      }
    },
    [currentPath, getFullPath, loadFiles, t]
  )

  // 复制/剪切
  const handleCopy = useCallback(() => {
    const names = selectedFiles.size > 0 ? Array.from(selectedFiles) : []
    if (names.length === 0 && selectedFile) {
      names.push(selectedFile.name)
    }
    if (names.length === 0) return

    setClipboard({ files: names, mode: 'copy', sourcePath: currentPath })
    showToast(t('copyToClipboard'), 'success', `${names.length} items`)
  }, [selectedFiles, selectedFile, currentPath, t])

  const handleCut = useCallback(() => {
    const names = selectedFiles.size > 0 ? Array.from(selectedFiles) : []
    if (names.length === 0 && selectedFile) {
      names.push(selectedFile.name)
    }
    if (names.length === 0) return

    setClipboard({ files: names, mode: 'cut', sourcePath: currentPath })
    showToast(t('cutToClipboard'), 'success', `${names.length} items`)
  }, [selectedFiles, selectedFile, currentPath, t])

  const handlePaste = useCallback(async () => {
    if (clipboard.files.length === 0) {
      showToast(t('clipboardEmpty'), 'error')
      return
    }

    const { files: names, mode, sourcePath } = clipboard
    const sources = names.map((name) =>
      sourcePath === '/' ? `/${name}` : `${sourcePath}/${name}`
    )

    try {
      const endpoint = mode === 'copy' ? '/api/files/copy' : '/api/files/move'
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources, destDir: currentPath }),
      })

      if (!res.ok) throw new Error('Operation failed')
      const result = await res.json()

      if (result.errors?.length > 0) {
        showToast(t(mode === 'copy' ? 'pasteFailed' : 'moveFailed'), 'error', `${result.errors.length} items failed`)
      } else {
        showToast(t(mode === 'copy' ? 'pasteSuccess' : 'moveSuccess'), 'success', `${names.length} items`)
      }

      if (mode === 'cut') {
        setClipboard({ files: [], mode: null })
      }

      setSelectedFiles(new Set())
      loadFiles(currentPath)
    } catch (err) {
      showToast(t('pasteFailed'), 'error', err.message)
    }
  }, [clipboard, currentPath, loadFiles, t])

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    const names = selectedFiles.size > 0 ? Array.from(selectedFiles) : []
    if (names.length === 0) return

    const paths = names.map((name) => getFullPath(name))
    try {
      const res = await fetch('/api/files/batch-delete', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      })

      if (!res.ok) throw new Error('Delete failed')
      const result = await res.json()

      if (result.errors?.length > 0) {
        showToast(t('deleteFailedCount', { count: result.errors.length }), 'error')
      } else {
        showToast(t('deleteSuccessCount', { count: names.length }), 'success')
      }

      setSelectedFiles(new Set())
      setSelectedFile(null)
      loadFiles(currentPath)
    } catch (err) {
      showToast(t('deleteFailed'), 'error', err.message)
    }
  }, [selectedFiles, currentPath, getFullPath, loadFiles, t])

  // 批量压缩
  const handleBatchCompress = useCallback(() => {
    const names = selectedFiles.size > 0 ? Array.from(selectedFiles) : []
    if (names.length === 0) return

    const paths = names.map((name) => getFullPath(name))
    setDialogState({
      type: 'compress',
      file: { name: `${names[0]}${names.length > 1 ? ' 等' : ''}.zip`, paths, isBatch: true },
    })
  }, [selectedFiles, currentPath, getFullPath])

  // 全选/反选
  const handleSelectAll = useCallback(() => {
    if (selectedFiles.size === sortedFiles.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(sortedFiles.map((f) => f.name)))
    }
  }, [selectedFiles, sortedFiles])

  const handleInvertSelection = useCallback(() => {
    setSelectedFiles((prev) => {
      const next = new Set()
      sortedFiles.forEach((f) => {
        if (!prev.has(f.name)) {
          next.add(f.name)
        }
      })
      return next
    })
  }, [sortedFiles])

  // 空白处右键菜单
  const handleBackgroundContextMenu = useCallback(
    (e) => {
      if (e.target.closest('tr')) return
      e.preventDefault()
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        file: null,
        isBackground: true,
      })
    },
    []
  )

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (dialogState.type || editingFile) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        handleSelectAll()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        handleCopy()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault()
        handleCut()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        handlePaste()
      } else if (e.key === 'Delete') {
        if (selectedFiles.size > 0) {
          handleBatchDelete()
        } else if (selectedFile) {
          setDialogState({ type: 'delete', file: selectedFile })
        }
      } else if (e.key === 'Escape') {
        setSelectedFiles(new Set())
        setContextMenu(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedFiles, selectedFile, dialogState, editingFile, handleSelectAll, handleCopy, handleCut, handlePaste, handleBatchDelete])

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <ArrowUpDown className="size-3 opacity-40" />
    return sortDir === 'asc' ? (
      <ArrowUp className="size-3" />
    ) : (
      <ArrowDown className="size-3" />
    )
  }

  const pathSegments = currentPath ? currentPath.split('/').filter(Boolean) : []
  const breadcrumbsCollapsed = pathSegments.length > 4

  const renderBreadcrumbSegment = (segment, i, absoluteIdx) => {
    const idx = absoluteIdx ?? i
    const segPath = '/' + pathSegments.slice(0, idx + 1).join('/')
    const isLast = idx === pathSegments.length - 1
    return (
      <BreadcrumbItem key={segPath}>
        <BreadcrumbSeparator />
        {isLast ? (
          <BreadcrumbPage className="truncate max-w-40">{segment}</BreadcrumbPage>
        ) : (
          <BreadcrumbLink
            onClick={(e) => {
              e.preventDefault()
              navigateTo(segPath)
            }}
            className="cursor-pointer truncate max-w-40"
          >
            {segment}
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
    )
  }

  if (route === 'widget') {
    const hash = window.location.hash
    if (hash.includes('disk-info')) {
      return <DiskInfoWidget />
    }
    if (hash.includes('drag-upload')) {
      return <DragUploadWidget />
    }
    return null
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-4 py-2 overflow-hidden">
        <Breadcrumb className="flex-1 min-w-0">
          <BreadcrumbList className="flex-nowrap overflow-hidden">
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={(e) => {
                  e.preventDefault()
                  navigateTo('/')
                }}
                className="flex items-center gap-1 cursor-pointer"
              >
                <Home className="size-3.5" />
                <span className="sr-only">{t('homeLabel')}</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbsCollapsed ? (
              <>
                {renderBreadcrumbSegment(pathSegments[0], 0, 0)}
                <BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbEllipsis />
                </BreadcrumbItem>
                {pathSegments.slice(-2).map((segment, i) =>
                  renderBreadcrumbSegment(segment, i, pathSegments.length - 2 + i)
                )}
              </>
            ) : (
              pathSegments.map((segment, i) => renderBreadcrumbSegment(segment, i, i))
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 pr-7 text-xs"
            size="sm"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSearchResults(null)
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              window.JSOS?.openAppWithArgs?.('dev.jsos.terminal', {
                startCommand: `/bin/jsh -c "cd '${currentPath}' && /bin/jsh"`
              })
            }}
            aria-label={t('openTerminal')}
          >
            <Terminal />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setDialogState({ type: 'upload', file: null })}
            aria-label={t('uploadLabel')}
          >
            <Upload />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setDialogState({ type: 'create', file: null })}
            aria-label={t('newLabel')}
          >
            <Plus />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={handleRefresh} aria-label={t('refreshLabel')}>
            <RefreshCw />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <Sidebar
          currentPath={currentPath}
          onNavigate={navigateTo}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          width={sidebarWidth}
        />

        {!sidebarCollapsed && (
          <ResizableDivider onDrag={handleSidebarDrag} />
        )}

        <div className="flex-1 min-w-0 flex">
          <div className="flex-1 min-w-0" onContextMenu={!isMobile ? handleBackgroundContextMenu : undefined}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Spinner className="size-5 text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-destructive text-sm">
                {error}
              </div>
            ) : sortedFiles.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2"
              >
                <FolderOpen className="size-8 opacity-40" />
                <span>{searchResults ? t('noResults') : t('emptyFolder')}</span>
              </div>
            ) : (
              <ScrollArea className="h-full select-none">
                <Table
                  onDragOver={!isMobile ? (e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                  } : undefined}
                  onDrop={!isMobile ? (e) => {
                    setDragOverFolder(null)
                    if (!e.dataTransfer.types.includes('application/json')) return
                    handleDrop(e, { name: '' })
                  } : undefined}
                >
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('name')}
                      >
                        <span className="flex items-center gap-1">
                          {t('nameColumn')} <SortIcon column="name" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none w-24"
                        onClick={() => handleSort('size')}
                      >
                        <span className="flex items-center gap-1">
                          {t('sizeColumn')} <SortIcon column="size" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none w-36"
                        onClick={() => handleSort('mtime')}
                      >
                        <span className="flex items-center gap-1">
                          {t('modifiedColumn')} <SortIcon column="mtime" />
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedFiles.map((entry) => (
                      <TableRow
                        key={entry.name}
                        className={`cursor-pointer select-none ${
                          selectedFiles.has(entry.name)
                            ? 'bg-accent/50'
                            : ''
                        } ${
                          dragOverFolder === entry.name
                            ? 'bg-primary/20 ring-2 ring-primary'
                            : ''
                        }`}
                        draggable={!isMobile}
                        onDragStart={!isMobile ? (e) => handleDragStart(e, entry) : undefined}
                        onDragOver={!isMobile ? (e) => handleDragOver(e, entry) : undefined}
                        onDragLeave={!isMobile ? handleDragLeave : undefined}
                        onDrop={!isMobile ? (e) => {
                          e.stopPropagation()
                          if (entry.isDirectory) {
                            handleDrop(e, entry)
                          }
                        } : undefined}
                        onClick={(e) => handleFileClick(e, entry)}
                        onDoubleClick={() => handleFileDoubleClick(entry)}
                        onContextMenu={!isMobile ? (e) => {
                          if (!selectedFiles.has(entry.name)) {
                            handleFileClick(e, entry)
                          }
                          handleContextMenu(e, entry)
                        } : undefined}
                      >
                        <TableCell>
                          <span className="flex items-center gap-2">
                            {getFileIcon(entry)}
                            <span className="truncate">{entry.name}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatSize(entry.size)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(entry.mtime)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>

          {editingFile && (
            <>
              <ResizableDivider onDrag={handleEditorDrag} />
              <FileEditor
                file={editingFile}
                onClose={() => setEditingFile(null)}
                onSave={() => loadFiles(currentPath)}
                width={editorWidth}
                isDark={isDark}
              />
            </>
          )}
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          isBackground={contextMenu.isBackground}
          onClose={() => setContextMenu(null)}
          onOpen={() => {
            handleFileDoubleClick(contextMenu.file)
          }}
          onPreview={() => {
            if (!contextMenu.file) return
            const fullPath =
              currentPath === '/'
                ? `/${contextMenu.file.name}`
                : `${currentPath}/${contextMenu.file.name}`
            if (contextMenu.file.isDirectory) {
              navigateTo(fullPath)
            } else {
              setEditingFile({ ...contextMenu.file, path: fullPath })
            }
          }}
          onRename={() => {
            setDialogState({ type: 'rename', file: contextMenu.file })
          }}
          onDelete={() => {
            if (selectedFiles.size > 1) {
              handleBatchDelete()
            } else {
              setDialogState({ type: 'delete', file: contextMenu.file })
            }
          }}
          onDownload={() => handleDownload(contextMenu.file)}
          onCompress={() => {
            if (selectedFiles.size > 1) {
              handleBatchCompress()
            } else {
              handleCompress(contextMenu.file)
            }
          }}
          onDecompress={() => handleDecompress(contextMenu.file)}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
          onSelectAll={handleSelectAll}
          onInvertSelection={handleInvertSelection}
          onUpload={() => setDialogState({ type: 'upload', file: null })}
          onCreateFile={() => setDialogState({ type: 'create', file: null, createType: 'file' })}
          onCreateFolder={() => setDialogState({ type: 'create', file: null, createType: 'folder' })}
          onRefresh={handleRefresh}
          hasClipboard={clipboard.files.length > 0}
          selectedCount={selectedFiles.size}
          hasFiles={sortedFiles.length > 0}
        />
      )}

      {dialogState.type === 'create' && (
        <CreateDialog
          currentPath={currentPath}
          onClose={() => setDialogState({ type: null, file: null })}
          onSuccess={handleCreateSuccess}
          defaultType={dialogState.createType}
        />
      )}

      {dialogState.type === 'rename' && dialogState.file && (
        <RenameDialog
          currentPath={currentPath}
          file={dialogState.file}
          onClose={() => setDialogState({ type: null, file: null })}
          onSuccess={handleRenameSuccess}
        />
      )}

      {dialogState.type === 'delete' && dialogState.file && (
        <DeleteDialog
          currentPath={currentPath}
          file={dialogState.file}
          onClose={() => setDialogState({ type: null, file: null })}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {dialogState.type === 'upload' && (
        <UploadDialog
          currentPath={currentPath}
          onClose={() => setDialogState({ type: null, file: null })}
          onSuccess={handleCreateSuccess}
        />
      )}

      {dialogState.type === 'compress' && dialogState.file && (
        <CompressDialog
          currentPath={currentPath}
          file={dialogState.file}
          existingFiles={files}
          onClose={() => setDialogState({ type: null, file: null })}
          onSuccess={handleCreateSuccess}
        />
      )}

      {dialogState.type === 'decompress' && dialogState.file && (
        <DecompressDialog
          currentPath={currentPath}
          file={dialogState.file}
          existingFiles={files}
          onClose={() => setDialogState({ type: null, file: null })}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  )
}
