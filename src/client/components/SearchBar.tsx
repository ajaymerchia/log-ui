import React, { useState, useEffect, useRef } from 'react'
import { useLogStore } from '../store/useLogStore'
import { Search, Filter, X } from 'lucide-react'

const SearchBar: React.FC = () => {
  const { filters, updateFilter, logs } = useLogStore()
  const [searchInput, setSearchInput] = useState(filters.search)
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchInput(value)
    updateFilter({ search: value })
  }

  const removeFilter = (type: string, value: string) => {
    switch (type) {
      case 'level':
        updateFilter({ levels: filters.levels.filter(l => l !== value) })
        break
      case 'tag':
        updateFilter({ tags: filters.tags.filter(t => t !== value) })
        break
      case 'timeRange':
        updateFilter({ timeRange: null })
        break
    }
  }

  const activeFiltersCount = filters.levels.length + filters.tags.length + (filters.timeRange ? 1 : 0)

  const logLevels = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']
  
  const toggleLogLevel = (level: string) => {
    if (filters.levels.includes(level as any)) {
      updateFilter({ levels: filters.levels.filter(l => l !== level) })
    } else {
      updateFilter({ levels: [...filters.levels, level as any] })
    }
  }

  // Get all unique tags from logs
  const getAllTags = () => {
    const allTags = new Set<string>()
    logs.forEach(log => {
      log.tags.forEach(tag => allTags.add(tag))
    })
    return Array.from(allTags).sort()
  }

  const toggleTag = (tag: string) => {
    if (filters.tags.includes(tag)) {
      updateFilter({ tags: filters.tags.filter(t => t !== tag) })
    } else {
      updateFilter({ tags: [...filters.tags, tag] })
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFiltersDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchInput}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 bg-black/5 dark:bg-white/5 border border-border rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                     placeholder-text-secondary text-sm"
          />
        </div>
        
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/5 border border-border rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 bg-primary rounded text-xs font-medium">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Filters Dropdown */}
          {showFiltersDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-surface-dark border border-border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
              <div className="p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-2">Log Levels</h3>
                  <div className="space-y-1">
                    {logLevels.map(level => {
                      const isActive = filters.levels.includes(level as any)
                      const levelColors = {
                        ERROR: 'text-error border-error/20',
                        WARN: 'text-warning border-warning/20', 
                        INFO: 'text-success border-success/20',
                        DEBUG: 'text-muted border-muted/20',
                        TRACE: 'text-muted border-muted/20'
                      }
                      return (
                        <button
                          key={level}
                          onClick={() => toggleLogLevel(level)}
                          className={`w-full text-left px-2 py-1 text-xs rounded border transition-colors
                            ${isActive 
                              ? `bg-primary/10 border-primary/20 text-primary font-medium` 
                              : `${levelColors[level as keyof typeof levelColors]} hover:bg-black/5 dark:hover:bg-white/5`
                            }`}
                        >
                          {level}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Tags Section */}
                {getAllTags().length > 0 && (
                  <div className="mb-4 pb-4 border-b border-border">
                    <h3 className="text-sm font-medium mb-2">Tags</h3>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {getAllTags().map(tag => {
                        const isActive = filters.tags.includes(tag)
                        return (
                          <label
                            key={tag}
                            className="flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => toggleTag(tag)}
                              className="w-3 h-3 rounded border-border/50 bg-black/5 dark:bg-white/5 checked:bg-primary checked:border-primary text-primary focus:ring-1 focus:ring-primary/50"
                            />
                            <span className={`${isActive ? 'text-primary font-medium' : 'text-text-primary'}`}>
                              [{tag}]
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                <div className="pt-2 border-t border-border">
                  <button
                    onClick={() => {
                      updateFilter({ levels: [], tags: [], timeRange: null })
                      setShowFiltersDropdown(false)
                    }}
                    className="w-full text-left px-2 py-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-text-secondary">Active filters:</span>
          
          {filters.levels.map(level => (
            <div key={level} className="filter-pill">
              <span>{level}</span>
              <button
                onClick={() => removeFilter('level', level)}
                className="hover:bg-primary/20 rounded p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          
          {filters.tags.map(tag => (
            <div key={tag} className="filter-pill">
              <span>[{tag}]</span>
              <button
                onClick={() => removeFilter('tag', tag)}
                className="hover:bg-primary/20 rounded p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          
          {filters.timeRange && (
            <div className="filter-pill">
              <span>Last 1 hour</span>
              <button
                onClick={() => removeFilter('timeRange', '')}
                className="hover:bg-primary/20 rounded p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchBar