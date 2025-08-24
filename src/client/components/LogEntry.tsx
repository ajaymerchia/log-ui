import React from 'react'
import { LogEntry as LogEntryType } from '../types'
import { useLogStore } from '../store/useLogStore'
import { Copy } from 'lucide-react'

interface Props {
  log: LogEntryType
}

const LogEntry: React.FC<Props> = ({ log }) => {
  const { updateFilter, filters, expandedEntries, toggleEntryExpansion, addToast } = useLogStore()
  const isExpanded = expandedEntries.has(log.id)

  const levelColors = {
    ERROR: 'border-error bg-error/5 text-error',
    WARN: 'border-warning bg-warning/5 text-warning',
    INFO: 'border-success bg-success/5 text-success',
    DEBUG: 'border-muted bg-muted/5 text-muted',
    TRACE: 'border-muted bg-muted/5 text-muted',
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      addToast('Log message copied to clipboard', 'success', 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        addToast('Log message copied to clipboard', 'success', 2000)
      } catch (fallbackErr) {
        console.error('Fallback copy also failed:', fallbackErr)
        addToast('Failed to copy to clipboard', 'error', 3000)
      }
    }
  }

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation()
    // Toggle the tag filter - if it's already in filters, remove it, otherwise add it
    const isTagActive = filters.tags.includes(tag)
    if (isTagActive) {
      updateFilter({ tags: filters.tags.filter(t => t !== tag) })
    } else {
      updateFilter({ tags: [...filters.tags, tag] })
    }
  }

  const handleLevelClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Toggle the level filter - if it's already filtered by this level, clear it, otherwise filter by this level
    const isLevelActive = filters.levels.includes(log.level) && filters.levels.length === 1
    if (isLevelActive) {
      updateFilter({ levels: [] })
    } else {
      updateFilter({ levels: [log.level] })
    }
  }

  const handleEntryClick = () => {
    toggleEntryExpansion(log.id)
  }

  return (
    <div
      className={`log-entry px-3 ${isExpanded ? 'py-2' : 'py-1.5'} border-l-2 cursor-pointer group relative font-mono text-xs leading-tight
        ${levelColors[log.level]} hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-150`}
      onClick={handleEntryClick}
    >
      {/* First row: metadata and truncated message */}
      <div className="flex items-center gap-2">
        {/* Timestamp - fixed width for alignment */}
        <div className="text-text-secondary font-mono flex-shrink-0 w-16 text-[11px]">
          {formatTime(log.timestamp)}
        </div>

        {/* Level badge - compact and clickable */}
        <button
          onClick={handleLevelClick}
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 min-w-[40px] text-center transition-all duration-150 hover:scale-105 cursor-pointer ${levelColors[log.level]}
            ${filters.levels.includes(log.level) && filters.levels.length === 1 ? 'ring-2 ring-white/30' : 'hover:brightness-110'}`}
          title={`Click to ${filters.levels.includes(log.level) && filters.levels.length === 1 ? 'remove' : 'add'} level filter`}
        >
          {log.level}
        </button>

        {/* Tags - compact */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {log.tags.map((tag, index) => {
            const isTagActive = filters.tags.includes(tag)
            return (
              <button
                key={index}
                onClick={(e) => handleTagClick(e, tag)}
                className={`px-1 py-0 text-[10px] rounded border transition-all duration-150 hover:scale-105 cursor-pointer leading-none
                  ${isTagActive 
                    ? 'bg-primary/20 text-primary border-primary/40 font-medium' 
                    : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15'
                  }`}
                title={`Click to ${isTagActive ? 'remove' : 'add'} tag filter`}
              >
                [{tag}]
              </button>
            )
          })}
        </div>

        {/* Message - always truncated in first row */}
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-mono truncate">
            {log.message.replace(/\s*\/[^\s]*\/demo\.log\s*$/, '')}
          </div>
        </div>

        {/* Copy action */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              copyToClipboard(log.message.replace(/\s*\/[^\s]*\/demo\.log\s*$/, ''))
            }}
            className="p-1 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary transition-colors"
            title="Copy message"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Second row: expanded content spanning full width */}
      {isExpanded && (
        <div className="mt-2">
          {/* Full message content spanning full width */}
          <div className="text-[11px] font-mono whitespace-pre-wrap break-words bg-black/10 p-2 rounded border border-white/10">
            {log.message.replace(/\s*\/[^\s]*\/demo\.log\s*$/, '')}
          </div>
          
          {/* Metadata below message if present */}
          {log.metadata && (
            <div className="mt-2 text-[10px] text-text-secondary bg-black/5 p-2 rounded border border-white/5">
              <div className="font-medium text-text-primary mb-1">Metadata:</div>
              {Object.entries(log.metadata).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium">{key}:</span> {String(value)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LogEntry