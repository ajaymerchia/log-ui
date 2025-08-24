import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useLogStore } from '../store/useLogStore'
import { Minus, Plus, RotateCcw, Clock } from 'lucide-react'

const Timeline: React.FC = () => {
  const { logs, filteredLogs, updateFilter, filters } = useLogStore()
  const [timelineWidth, setTimelineWidth] = useState(0)
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null)
  const [dragStartX, setDragStartX] = useState(0)
  const [showManualInput, setShowManualInput] = useState(false)
  const [startTimeInput, setStartTimeInput] = useState('')
  const [endTimeInput, setEndTimeInput] = useState('')
  const [dragPreview, setDragPreview] = useState<{ start: Date; end: Date } | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.offsetWidth)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // All hooks must be called before any conditional rendering
  const handleMouseDown = useCallback((e: React.MouseEvent, handle: 'start' | 'end') => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(handle)
    setDragStartX(e.clientX)
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
    setDragStartX(0)
  }, [])

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault()
        if (!timelineRef.current || logs.length === 0) return

        const rect = timelineRef.current.getBoundingClientRect()
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
        const position = (x / rect.width) * 100
        
        if (totalTimeSpan === 0) return
        
        const positionToTimeLocal = (pos: number): Date => {
          const timeOffset = (pos / 100) * totalTimeSpan
          return new Date(allStartTime.getTime() + timeOffset)
        }
        
        const newTime = positionToTimeLocal(position)
        const currentStart = filters.timeRange?.start || allStartTime
        const currentEnd = filters.timeRange?.end || allEndTime

        if (isDragging === 'start') {
          const newStart = new Date(Math.max(allStartTime.getTime(), Math.min(newTime.getTime(), currentEnd.getTime())))
          const newRange = { start: newStart, end: currentEnd }
          setDragPreview(newRange)
          updateFilter({ timeRange: newRange })
        } else if (isDragging === 'end') {
          const newEnd = new Date(Math.min(allEndTime.getTime(), Math.max(newTime.getTime(), currentStart.getTime())))
          const newRange = { start: currentStart, end: newEnd }
          setDragPreview(newRange)
          updateFilter({ timeRange: newRange })
        }
      }

      const handleMouseUpGlobal = () => {
        setIsDragging(null)
        setDragStartX(0)
        setDragPreview(null)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUpGlobal)
      document.addEventListener('selectstart', (e) => e.preventDefault())
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUpGlobal)
        document.removeEventListener('selectstart', (e) => e.preventDefault())
      }
    }
  }, [isDragging, logs, filters.timeRange, updateFilter])

  const formatInputTime = (date: Date) => {
    return date.toISOString().slice(0, 19)
  }

  const parseInputTime = (timeString: string): Date | null => {
    try {
      const date = new Date(timeString)
      return isNaN(date.getTime()) ? null : date
    } catch {
      return null
    }
  }

  const toggleManualInput = () => {
    if (!showManualInput && filteredLogs.length > 0) {
      const allStartTime = new Date(Math.min(...filteredLogs.map(log => new Date(log.timestamp).getTime())))
      const allEndTime = new Date(Math.max(...filteredLogs.map(log => new Date(log.timestamp).getTime())))
      const currentStart = filters.timeRange?.start || allStartTime
      const currentEnd = filters.timeRange?.end || allEndTime
      
      setStartTimeInput(formatInputTime(currentStart))
      setEndTimeInput(formatInputTime(currentEnd))
    }
    setShowManualInput(!showManualInput)
  }

  const applyManualTimeRange = () => {
    const startDate = parseInputTime(startTimeInput)
    const endDate = parseInputTime(endTimeInput)
    
    if (startDate && endDate && startDate.getTime() < endDate.getTime()) {
      updateFilter({ 
        timeRange: { 
          start: startDate, 
          end: endDate 
        } 
      })
      setShowManualInput(false)
    }
  }

  const cancelManualInput = () => {
    setShowManualInput(false)
    setStartTimeInput('')
    setEndTimeInput('')
  }

  // Early return after all hooks are called
  if (filteredLogs.length === 0) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-secondary">Timeline</span>
          <div className="text-xs text-text-secondary">No data</div>
        </div>
      </div>
    )
  }

  // Get the full range of ALL logs (this should never change during drag operations)
  // Use all logs, not just filtered ones, to maintain consistent timeline range
  const allStartTime = new Date(Math.min(...logs.map(log => new Date(log.timestamp).getTime())))
  const allEndTime = new Date(Math.max(...logs.map(log => new Date(log.timestamp).getTime())))
  const totalTimeSpan = allEndTime.getTime() - allStartTime.getTime()

  // Current filter range or default to full range
  const currentStart = filters.timeRange?.start || allStartTime
  const currentEnd = filters.timeRange?.end || allEndTime

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatTimeWithMs = (date: Date) => {
    const time = date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    const ms = date.getMilliseconds().toString().padStart(3, '0')
    return `${time}.${ms}`
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Convert time to position percentage
  const timeToPosition = (time: Date): number => {
    if (totalTimeSpan === 0) return 0
    return ((time.getTime() - allStartTime.getTime()) / totalTimeSpan) * 100
  }

  // Convert position percentage to time
  const positionToTime = (position: number): Date => {
    const timeOffset = (position / 100) * totalTimeSpan
    return new Date(allStartTime.getTime() + timeOffset)
  }

  const startPosition = timeToPosition(currentStart)
  const endPosition = timeToPosition(currentEnd)

  const resetTimeRange = () => {
    updateFilter({ timeRange: null })
  }

  const isFiltered = filters.timeRange !== null

  return (
    <div className={`space-y-3 ${isDragging ? 'cursor-ew-resize' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-secondary">Timeline</span>
          <button
            onClick={toggleManualInput}
            className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text-primary bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
            title="Set custom time range"
          >
            <Clock className="w-3 h-3" />
            Custom Range
          </button>
          {isFiltered && (
            <button
              onClick={resetTimeRange}
              className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text-primary bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
              title="Reset time filter"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Manual time input form */}
      {showManualInput && (
        <div className="bg-black/5 dark:bg-white/5 border border-border rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <Clock className="w-3 h-3" />
            Show Logs Between
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Start Time</label>
              <input
                type="datetime-local"
                value={startTimeInput}
                onChange={(e) => setStartTimeInput(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-white dark:bg-black border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">End Time</label>
              <input
                type="datetime-local"
                value={endTimeInput}
                onChange={(e) => setEndTimeInput(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-white dark:bg-black border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={applyManualTimeRange}
              className="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors"
            >
              Apply
            </button>
            <button
              onClick={cancelManualInput}
              className="px-3 py-1 text-xs bg-black/10 dark:bg-white/10 text-text-secondary hover:text-text-primary rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {/* Selected time range display */}
        {isFiltered && !dragPreview && (
          <div className="flex items-center justify-between text-xs">
            <div className="bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20">
              {formatDate(currentStart)}
            </div>
            <div className="bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20">
              {formatDate(currentEnd)}
            </div>
          </div>
        )}

        <div className="relative" style={{ height: '32px', marginBottom: '4rem' }}>
          {/* Timeline track */}
          <div
            ref={timelineRef}
            className="absolute top-3 left-0 right-0 h-2 bg-border rounded-full cursor-pointer"
            onClick={(e) => {
              if (!timelineRef.current || isDragging) return
              
              // Don't handle clicks on handles
              if ((e.target as HTMLElement).classList.contains('timeline-handle')) return
              
              const rect = timelineRef.current.getBoundingClientRect()
              const x = e.clientX - rect.left
              const position = (x / rect.width) * 100
              const clickTime = positionToTime(position)
              
              // Set a 1-hour range around the clicked time
              const oneHour = 60 * 60 * 1000
              const newStart = new Date(Math.max(allStartTime.getTime(), clickTime.getTime() - oneHour / 2))
              const newEnd = new Date(Math.min(allEndTime.getTime(), clickTime.getTime() + oneHour / 2))
              
              updateFilter({ timeRange: { start: newStart, end: newEnd } })
            }}
          >
            {/* Full timeline background */}
            <div className="absolute inset-0 bg-gradient-to-r from-border to-border/50 rounded-full" />
            
            {/* Selected range highlight */}
            <div
              className="absolute top-0 h-full bg-primary/30 rounded-full transition-all duration-150"
              style={{
                left: `${startPosition}%`,
                width: `${endPosition - startPosition}%`
              }}
            />
          </div>

          {/* Start handle */}
          <div
            className={`timeline-handle absolute w-4 h-4 bg-primary border-2 border-white rounded-full cursor-ew-resize hover:scale-110 transition-transform shadow-md z-20 ${
              isDragging === 'start' ? 'scale-110 shadow-lg' : ''
            }`}
            style={{ 
              left: `calc(${startPosition}% - 8px)`, 
              top: '-1px',
              userSelect: 'none', 
              touchAction: 'none' 
            }}
            onMouseDown={(e) => handleMouseDown(e, 'start')}
            title={`Start: ${formatDate(currentStart)}`}
          />

          {/* End handle */}
          <div
            className={`timeline-handle absolute w-4 h-4 bg-primary border-2 border-white rounded-full cursor-ew-resize hover:scale-110 transition-transform shadow-md z-20 ${
              isDragging === 'end' ? 'scale-110 shadow-lg' : ''
            }`}
            style={{ 
              left: `calc(${endPosition}% - 8px)`,
              top: '-1px', 
              userSelect: 'none', 
              touchAction: 'none' 
            }}
            onMouseDown={(e) => handleMouseDown(e, 'end')}
            title={`End: ${formatDate(currentEnd)}`}
          />

          {/* Log density visualization */}
          <div className="absolute top-5 left-0 right-0 h-4 flex items-end pointer-events-none">
            {(() => {
              // Cap the number of bins for performance while maintaining visual density
              const maxBins = 150
              const idealBins = Math.floor(timelineWidth / 3)
              const numBins = Math.min(maxBins, Math.max(20, idealBins))
              
              // Pre-calculate all bin counts for better performance
              const binCounts = Array.from({ length: numBins }, (_, i) => {
                const timeSlice = allStartTime.getTime() + (i / numBins) * totalTimeSpan
                const sliceWidth = totalTimeSpan / numBins
                return filteredLogs.filter(log => {
                  const logTime = new Date(log.timestamp).getTime()
                  return logTime >= timeSlice && logTime < timeSlice + sliceWidth
                }).length
              })
              
              const maxLogsInAnySlice = Math.max(1, Math.max(...binCounts))
              
              return binCounts.map((logsInSlice, i) => {
                const height = Math.max(1, (logsInSlice / maxLogsInAnySlice) * 12)
                
                return (
                  <div
                    key={i}
                    className="bg-primary/60 rounded-t flex-1"
                    style={{ 
                      height: `${height}px`,
                      marginRight: '1px',
                      minWidth: '1px'
                    }}
                    title={`${logsInSlice} logs`}
                  />
                )
              })
            })()}
          </div>

          {/* Time labels under endpoints */}
          <div className="absolute -bottom-10 left-0 right-0 flex justify-between text-xs text-text-secondary pointer-events-none">
            <div className="text-left">
              <div className="font-mono">{formatTimeWithMs(allStartTime)}</div>
              <div className="text-xs opacity-60">{formatDate(allStartTime).split(',')[0]}</div>
            </div>
            <div className="text-right">
              <div className="font-mono">{formatTimeWithMs(allEndTime)}</div>
              <div className="text-xs opacity-60">{formatDate(allEndTime).split(',')[0]}</div>
            </div>
          </div>

          {/* Drag preview display - below timeline */}
          {dragPreview && isDragging && (
            <div className="absolute -bottom-16 left-0 right-0 flex items-center justify-center text-xs pointer-events-none">
              <div className="bg-primary/20 text-primary px-3 py-1 rounded border border-primary/30 shadow-sm font-mono">
                {formatTimeWithMs(dragPreview.start)} → {formatTimeWithMs(dragPreview.end)}
                <span className="ml-2 text-xs opacity-70 font-sans">
                  ({Math.round((dragPreview.end.getTime() - dragPreview.start.getTime()) / 60000)}m duration)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Timeline