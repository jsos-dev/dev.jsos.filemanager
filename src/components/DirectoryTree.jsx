import { useState, useEffect, useCallback } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FileText,
  FileCode,
  FileImage,
  FileArchive,
} from 'lucide-react'

function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css'].includes(ext))
    return <FileCode className="size-3.5 text-info" />
  if (['md', 'txt', 'log'].includes(ext))
    return <FileText className="size-3.5 text-muted-foreground" />
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext))
    return <FileImage className="size-3.5 text-success" />
  if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext))
    return <FileArchive className="size-3.5 text-warning" />
  return <File className="size-3.5 text-muted-foreground" />
}

function DirectoryNode({ path, name, currentPath, onNavigate, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth === 0)
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const isCurrentPath = currentPath === path
  const isAncestor = currentPath ? currentPath.startsWith(path + '/') : false

  const loadChildren = useCallback(async () => {
    if (loading || hasLoaded) return

    setLoading(true)
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      const dirs = data.entries
        .filter((e) => e.isDirectory)
        .map((e) => ({
          name: e.name,
          path: path === '/' ? `/${e.name}` : `${path}/${e.name}`,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setChildren(dirs)
      setHasLoaded(true)
    } catch {
      setChildren([])
    } finally {
      setLoading(false)
    }
  }, [path, loading, hasLoaded])

  useEffect(() => {
    if (depth === 0 && !hasLoaded) {
      loadChildren()
    }
  }, [depth, hasLoaded, loadChildren])

  useEffect(() => {
    if ((isAncestor || isCurrentPath) && !expanded) {
      setExpanded(true)
      loadChildren()
    }
  }, [isAncestor, isCurrentPath, expanded, loadChildren])

  const handleToggle = useCallback(() => {
    if (!expanded && !hasLoaded) {
      loadChildren()
    }
    setExpanded((prev) => !prev)
  }, [expanded, hasLoaded, loadChildren])

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation()
      onNavigate(path)
      if (!expanded) {
        handleToggle()
      }
    },
    [path, onNavigate, expanded, handleToggle]
  )

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-0.5 px-2 cursor-pointer text-xs hover:bg-accent/50 rounded-sm ${
          isCurrentPath ? 'bg-accent text-accent-foreground' : 'text-foreground/80'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleToggle()
          }}
          className="shrink-0 p-0.5 hover:bg-accent rounded-sm"
        >
          {loading ? (
            <div className="size-3.5 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
          ) : expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>

        {expanded ? (
          <FolderOpen className="size-3.5 text-warning shrink-0" />
        ) : (
          <Folder className="size-3.5 text-warning shrink-0" />
        )}

        <span className="truncate">{name}</span>
      </div>

      {expanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <DirectoryNode
              key={child.path}
              path={child.path}
              name={child.name}
              currentPath={currentPath}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DirectoryTree({ currentPath, onNavigate }) {
  return (
    <div className="py-1">
      <DirectoryNode
        path="/"
        name="/"
        currentPath={currentPath}
        onNavigate={onNavigate}
        depth={0}
      />
    </div>
  )
}
