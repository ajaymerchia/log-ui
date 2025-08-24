import React, { useState, useEffect, useRef } from 'react'
import { useLogStore } from '../store/useLogStore'
import SearchBar from './SearchBar'
import Timeline from './Timeline'
import LogEntry from './LogEntry'
import FileUpload from './FileUpload'
import { VariableSizeList as List } from 'react-window'

const LogViewer: React.FC = () => {
  const { filteredLogs, autoScroll, sources, expandedEntries } = useLogStore()
  console.log('[LogViewer] Rendering with:', {
    filteredLogsCount: filteredLogs.length,
    autoScroll,
    sourcesCount: sources.length,
  });
  const listRef = useRef<List>(null)
  const [listHeight, setListHeight] = useState(600)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setListHeight(window.innerHeight - rect.top - 60) // Account for status bar
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  useEffect(() => {
    if (autoScroll && listRef.current && filteredLogs.length > 0) {
      listRef.current.scrollToItem(filteredLogs.length - 1, 'end')
    }
  }, [filteredLogs, autoScroll])

  // Reset item sizes when entries expand/collapse
  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0)
    }
  }, [expandedEntries])

  const getItemSize = (index: number) => {
    const log = filteredLogs[index]
    const isExpanded = expandedEntries.has(log.id)
    
    if (isExpanded) {
      // Base height for first row (metadata row)
      let height = 32
      
      // Add height for expanded content section
      height += 8 // margin-top for expanded section
      
      // Calculate message content height - more accurate calculation
      // Assuming ~100 characters per line in the expanded container
      const messageLines = Math.max(1, Math.ceil(log.message.length / 100))
      height += 16 + (messageLines * 16) + 16 // padding + content lines + padding
      
      // Add metadata section height if present
      if (log.metadata) {
        const metadataLines = Object.keys(log.metadata).length
        height += 8 // margin-top
        height += 16 + 4 + (metadataLines * 14) + 16 // padding + header + lines + padding
      }
      
      return height
    }
    
    return 32 // Default compact height
  }

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <LogEntry log={filteredLogs[index]} />
    </div>
  )

  // Show file upload if no sources are connected
  if (sources.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <FileUpload />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border">
        <SearchBar />
      </div>
      
      <div className="px-4 py-3 border-b border-border">
        <Timeline />
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted/10 flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="text-lg font-medium mb-2">No logs to display</h3>
              <p className="text-text-secondary">
                Waiting for log entries or adjust your filters
              </p>
            </div>
          </div>
        ) : (
          <List
            ref={listRef}
            height={listHeight}
            itemCount={filteredLogs.length}
            itemSize={getItemSize}
            overscanCount={10}
            className="scrollbar-thin scrollbar-thumb-muted/20 scrollbar-track-transparent"
          >
            {Row}
          </List>
        )}
      </div>
    </div>
  )
}

export default LogViewer