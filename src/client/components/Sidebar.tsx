import React from 'react'
import { useLogStore } from '../store/useLogStore'
import { ChevronLeft, File, AlertTriangle, Clock, AlertCircle } from 'lucide-react'

const Sidebar: React.FC = () => {
  const { sources, filters, filteredLogs, logs, updateFilter, toggleSource, isSidebarCollapsed, toggleSidebar, isMobileSidebarOpen, toggleMobileSidebar } = useLogStore()

  // console.log('[Sidebar] Rendering with:', {
  //   sources,
  //   filters,
  // });

  // Calculate filtered count per source
  const getFilteredCountForSource = (sourceId: string) => {
    return filteredLogs.filter(log => log.source === sourceId).length
  }

  // Calculate total count per source from actual logs in store
  const getTotalCountForSource = (sourceId: string) => {
    return logs.filter(log => log.source === sourceId).length
  }

  const quickFilters = [
    {
      id: 'errors',
      label: 'Errors Only',
      icon: AlertCircle,
      active: filters.levels.includes('ERROR') && filters.levels.length === 1,
      onClick: () => updateFilter({ 
        levels: filters.levels.includes('ERROR') && filters.levels.length === 1 ? [] : ['ERROR'] 
      })
    },
    {
      id: 'last5min',
      label: 'Last 5 minutes',
      icon: Clock,
      active: false,
      onClick: () => {
        const now = new Date()
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
        updateFilter({ timeRange: { start: fiveMinutesAgo, end: now } })
      }
    },
    {
      id: 'warnings',
      label: 'Warnings',
      icon: AlertTriangle,
      active: filters.levels.includes('WARN') && filters.levels.length === 1,
      onClick: () => updateFilter({ 
        levels: filters.levels.includes('WARN') && filters.levels.length === 1 ? [] : ['WARN'] 
      })
    }
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-12' : 'w-64'} bg-white dark:bg-surface-dark border-r border-border flex-shrink-0 transition-all duration-200 hidden sm:block`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            {!isSidebarCollapsed && <h2 className="sidebar-title">Log Sources</h2>}
            <button 
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded" 
              onClick={toggleSidebar}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform duration-200 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

        {!isSidebarCollapsed && (
          <>
            <div className="space-y-2 mb-6">
              {sources.map((source) => {
                const filteredCount = getFilteredCountForSource(source.id)
                const totalCount = getTotalCountForSource(source.id)
                return (
                  <div
                    key={source.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors
                      ${source.isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                    onClick={() => toggleSource(source.id)}
                  >
                    <File className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{source.name}</div>
                      {source.lastActivity && (
                        <div className="text-xs text-text-secondary">
                          {filteredCount === totalCount 
                            ? `${totalCount} entries` 
                            : `${filteredCount} / ${totalCount} entries`}
                        </div>
                      )}
                    </div>
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: source.color }}
                    />
                  </div>
                )
              })}
              
              {sources.length === 0 && (
                <div className="text-sm text-text-secondary text-center py-8">
                  No log sources connected
                </div>
              )}
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-title">Quick Filters</h3>
              <div className="space-y-1">
                {quickFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={filter.onClick}
                    className={`quick-filter flex items-center gap-2 ${filter.active ? 'active' : ''}`}
                  >
                    <filter.icon className="w-4 h-4" />
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 sm:hidden"
            onClick={toggleMobileSidebar}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-surface-dark border-r border-border z-50 sm:hidden transform transition-transform duration-300">
            <div className="p-4 h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="sidebar-title">Log Sources</h2>
                <button 
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded" 
                  onClick={toggleMobileSidebar}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 mb-6">
                {sources.map((source) => {
                  const filteredCount = getFilteredCountForSource(source.id)
                  const totalCount = getTotalCountForSource(source.id)
                  return (
                    <div
                      key={source.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors
                        ${source.isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                      onClick={() => toggleSource(source.id)}
                    >
                      <File className="w-4 h-4" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{source.name}</div>
                        {source.lastActivity && (
                          <div className="text-xs text-text-secondary">
                            {filteredCount === totalCount 
                              ? `${totalCount} entries` 
                              : `${filteredCount} / ${totalCount} entries`}
                          </div>
                        )}
                      </div>
                      <div 
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: source.color }}
                      />
                    </div>
                  )
                })}
                
                {sources.length === 0 && (
                  <div className="text-sm text-text-secondary text-center py-8">
                    No log sources connected
                  </div>
                )}
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-title">Quick Filters</h3>
                <div className="space-y-1">
                  {quickFilters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => {
                        filter.onClick()
                        toggleMobileSidebar() // Close mobile sidebar after filter selection
                      }}
                      className={`quick-filter flex items-center gap-2 ${filter.active ? 'active' : ''}`}
                    >
                      <filter.icon className="w-4 h-4" />
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  )
}

export default Sidebar