import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useLogStore } from '../store/useLogStore'
import { Minus, Plus, RotateCcw } from 'lucide-react'

const Timeline: React.FC = () => {
  const { filteredLogs, updateFilter, filters } = useLogStore()
  const [timelineWidth, setTimelineWidth] = useState(0)
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null)
  const [dragStartX, setDragStartX] = useState(0)
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
    setIsDragging(handle)
    setDragStartX(e.clientX)
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
  }, [])

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!timelineRef.current) return

        const rect = timelineRef.current.getBoundingClientRect()
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
        const position = (x / rect.width) * 100
        
        if (filteredLogs.length === 0) return
        
        const allStartTime = new Date(Math.min(...filteredLogs.map(log => new Date(log.timestamp).getTime())))
        const allEndTime = new Date(Math.max(...filteredLogs.map(log => new Date(log.timestamp).getTime())))
        const totalTimeSpan = allEndTime.getTime() - allStartTime.getTime()
        
        const positionToTime = (pos: number): Date => {
          const timeOffset = (pos / 100) * totalTimeSpan
          return new Date(allStartTime.getTime() + timeOffset)
        }
        
        const newTime = positionToTime(position)
        const currentStart = filters.timeRange?.start || allStartTime
        const currentEnd = filters.timeRange?.end || allEndTime

        if (isDragging === 'start') {
          const newStart = newTime.getTime() < currentEnd.getTime() ? newTime : new Date(currentEnd.getTime() - 60000)
          updateFilter({ 
            timeRange: { 
              start: newStart, 
              end: currentEnd 
            } 
          })
        } else if (isDragging === 'end') {
          const newEnd = newTime.getTime() > currentStart.getTime() ? newTime : new Date(currentStart.getTime() + 60000)
          updateFilter({ 
            timeRange: { 
              start: currentStart, 
              end: newEnd 
            } 
          })
        }
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, filteredLogs, filters.timeRange, updateFilter, handleMouseUp])

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

  // Get the full range of all logs (not just filtered ones for the timeline base)
  const allStartTime = new Date(Math.min(...filteredLogs.map(log => new Date(log.timestamp).getTime())))
  const allEndTime = new Date(Math.max(...filteredLogs.map(log => new Date(log.timestamp).getTime())))
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-secondary">Timeline</span>
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
        
        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <span>{formatTime(allStartTime)}</span>
          <span>{formatTime(allEndTime)}</span>
        </div>
      </div>

      <div className="space-y-2">
        {/* Selected time range display */}
        {isFiltered && (
          <div className="flex items-center justify-between text-xs">
            <div className="bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20">
              {formatDate(currentStart)}
            </div>
            <div className="bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20">
              {formatDate(currentEnd)}
            </div>
          </div>
        )}

        <div className="relative" style={{ height: '32px' }}>
          {/* Timeline track */}
          <div
            ref={timelineRef}
            className="absolute top-3 left-0 right-0 h-2 bg-border rounded-full cursor-pointer"
            onClick={(e) => {
              if (!timelineRef.current) return
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
            className="absolute top-0 w-4 h-4 bg-primary border-2 border-white rounded-full cursor-ew-resize hover:scale-110 transition-transform shadow-md"
            style={{ left: `calc(${startPosition}% - 8px)` }}
            onMouseDown={(e) => handleMouseDown(e, 'start')}
            title={`Start: ${formatDate(currentStart)}`}
          />

          {/* End handle */}
          <div
            className="absolute top-0 w-4 h-4 bg-primary border-2 border-white rounded-full cursor-ew-resize hover:scale-110 transition-transform shadow-md"
            style={{ left: `calc(${endPosition}% - 8px)` }}
            onMouseDown={(e) => handleMouseDown(e, 'end')}
            title={`End: ${formatDate(currentEnd)}`}
          />

          {/* Log density visualization */}
          <div className="absolute top-5 left-0 right-0 h-4 flex items-end pointer-events-none">
            {Array.from({ length: Math.floor(timelineWidth / 3) }, (_, i) => {
              const timeSlice = allStartTime.getTime() + (i / Math.floor(timelineWidth / 3)) * totalTimeSpan
              const sliceWidth = totalTimeSpan / Math.floor(timelineWidth / 3)
              const logsInSlice = filteredLogs.filter(log => {
                const logTime = new Date(log.timestamp).getTime()
                return logTime >= timeSlice && logTime < timeSlice + sliceWidth
              }).length

              const maxLogsInAnySlice = Math.max(1, Math.max(...Array.from({ length: Math.floor(timelineWidth / 3) }, (_, j) => {
                const tSlice = allStartTime.getTime() + (j / Math.floor(timelineWidth / 3)) * totalTimeSpan
                const tSliceWidth = totalTimeSpan / Math.floor(timelineWidth / 3)
                return filteredLogs.filter(log => {
                  const logTime = new Date(log.timestamp).getTime()
                  return logTime >= tSlice && logTime < tSlice + tSliceWidth
                }).length
              })))

              const height = Math.max(1, (logsInSlice / maxLogsInAnySlice) * 12)
              
              return (
                <div
                  key={i}
                  className="w-0.5 bg-primary/60 rounded-t mr-0.5"
                  style={{ height: `${height}px` }}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Timeline