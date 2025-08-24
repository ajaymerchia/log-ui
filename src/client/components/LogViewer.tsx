import React, { useState, useEffect, useRef } from 'react'
import { useLogStore } from '../store/useLogStore'
import SearchBar from './SearchBar'
import Timeline from './Timeline'
import LogEntry from './LogEntry'
import FileUpload from './FileUpload'

const LogViewer: React.FC = () => {
  const { filteredLogs, autoScroll, sources, expandedEntries } = useLogStore()
  // console.log('[LogViewer] Rendering with:', {
  //   filteredLogsCount: filteredLogs.length,
  //   autoScroll,
  //   sourcesCount: sources.length,
  // });
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto scroll effect
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current && filteredLogs.length > 0) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [filteredLogs, autoScroll, expandedEntries])


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

      <div ref={containerRef} className="flex-1" style={{overflowY: "scroll"}}>
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
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50 scrollbar-thin scrollbar-thumb-muted/20 scrollbar-track-transparent"
          >
            <div className="flex flex-col pb-48">
              {filteredLogs.map((log) => (
                <LogEntry key={log.id} log={log} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LogViewer