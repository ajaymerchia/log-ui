import React from 'react'
import { useLogStore } from '../store/useLogStore'
import { ChevronDown } from 'lucide-react'

const StatusBar: React.FC = () => {
  const { 
    isConnected, 
    filteredLogs, 
    logs, 
    filters, 
    autoScroll, 
    setAutoScroll 
  } = useLogStore()

  // console.log('[StatusBar] Rendering with:', {
  //   isConnected,
  //   filteredLogsCount: filteredLogs.length,
  //   totalLogsCount: logs.length,
  //   filters,
  //   autoScroll,
  // });

  const activeFiltersCount = filters.levels.length + filters.tags.length + (filters.timeRange ? 1 : 0)

  return (
    <div className="h-8 px-4 flex items-center justify-between border-t border-border bg-white dark:bg-surface-dark text-xs text-text-secondary">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-success' : 'bg-error'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span>
            {filteredLogs.length.toLocaleString()} 
            {filteredLogs.length !== logs.length && (
              <span className="text-text-secondary"> of {logs.length.toLocaleString()}</span>
            )} entries
          </span>
          
          {activeFiltersCount > 0 && (
            <span>{activeFiltersCount} filters active</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors
            ${autoScroll 
              ? 'text-success bg-success/10' 
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
            }`}
        >
          <span>Auto-scroll: {autoScroll ? 'ON' : 'OFF'}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

export default StatusBar