import { useState, useCallback, useEffect } from 'react'

export default function ResizableDivider({ onDrag, direction = 'horizontal' }) {
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      onDrag(e)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, onDrag, direction])

  return (
    <div
      className={`shrink-0 group relative ${
        direction === 'horizontal'
          ? 'w-px cursor-col-resize hover:bg-primary/50'
          : 'h-px cursor-row-resize hover:bg-primary/50'
      } ${isDragging ? 'bg-primary/50' : 'bg-border'} transition-colors`}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`absolute ${
          direction === 'horizontal'
            ? 'inset-y-0 -left-2 -right-2'
            : 'inset-x-0 -top-2 -bottom-2'
        }`}
      />
    </div>
  )
}
