import React, { useState } from 'react'
import { LogEntry as LogEntryType, LogLevel } from '../types'
import { useLogStore } from '../store/useLogStore'
import { Copy, AlertTriangle, X } from 'lucide-react'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import 'highlight.js/styles/github-dark.css'

// Register the json language
hljs.registerLanguage('json', json)

interface Props {
  log: LogEntryType
}

interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  originalData: string
  errorMessage: string
}

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, originalData, errorMessage }) => {
  if (!isOpen) return null

  let highlightedCode: string
  try {
    // Try to parse as JSON first, if successful highlight as JSON
    JSON.parse(originalData)
    highlightedCode = hljs.highlight(originalData, { language: 'json' }).value
  } catch {
    // If not JSON, just escape HTML and display as plain text
    highlightedCode = originalData.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl max-h-[80vh] w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Log Rendering Error</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-3">
            <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">Error Details:</h4>
            <p className="text-sm text-orange-700 dark:text-orange-300">{errorMessage}</p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Original Log Data:</h4>
            <div className="bg-gray-950 rounded p-4 overflow-auto max-h-96">
              <pre className="text-sm">
                <code 
                  className="hljs language-json"
                  dangerouslySetInnerHTML={{ __html: highlightedCode }}
                />
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const LogEntry: React.FC<Props> = ({ log }) => {
  console.log('[LOG_ENTRY] Rendering log entry:', log)
  const { updateFilter, filters, expandedEntries, toggleEntryExpansion, addToast } = useLogStore()
  const [showErrorModal, setShowErrorModal] = useState(false)

  // Use the log entry directly
  const actualLog = log
  const isExpanded = expandedEntries.has(actualLog.id)

  // Validation and replacement logic - create a properly typed validated log
  const validatedLog: Required<Omit<LogEntryType, 'source' | 'metadata'>> & { 
    timestamp: Date, 
    source?: string, 
    metadata?: Record<string, any> 
  } = { 
    ...actualLog,
    timestamp: new Date(), // Will be properly set below
    tags: [...(actualLog.tags || [])] // Ensure we have a copy
  }
  
  let isValid = true
  const validationIssues: string[] = []
  const originalData = JSON.stringify(log, null, 2)

  // Validate ID
  if (!actualLog.id || typeof actualLog.id !== 'string' || actualLog.id.trim() === '') {
    console.warn('[LOG_ENTRY] Invalid ID detected:', actualLog.id)
    validatedLog.id = `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    isValid = false
    validationIssues.push('Invalid or missing ID - replaced with fallback')
  } else {
    validatedLog.id = actualLog.id
  }

  // Validate and convert timestamp
  if (!actualLog.timestamp) {
    console.warn('[LOG_ENTRY] Missing timestamp, using current time')
    validatedLog.timestamp = new Date()
    isValid = false
    validationIssues.push('Missing timestamp - replaced with current time')
  } else if (actualLog.timestamp instanceof Date) {
    if (isNaN(actualLog.timestamp.getTime())) {
      console.warn('[LOG_ENTRY] Invalid Date object:', actualLog.timestamp)
      validatedLog.timestamp = new Date()
      isValid = false
      validationIssues.push('Invalid Date object - replaced with current time')
    } else {
      validatedLog.timestamp = actualLog.timestamp
    }
  } else if (typeof actualLog.timestamp === 'string') {
    const parsedDate = new Date(actualLog.timestamp)
    if (isNaN(parsedDate.getTime())) {
      console.warn('[LOG_ENTRY] Invalid timestamp string:', actualLog.timestamp)
      validatedLog.timestamp = new Date()
      isValid = false
      validationIssues.push(`Invalid timestamp string "${actualLog.timestamp}" - replaced with current time`)
    } else {
      validatedLog.timestamp = parsedDate
    }
  } else {
    console.warn('[LOG_ENTRY] Invalid timestamp type:', typeof actualLog.timestamp, actualLog.timestamp)
    validatedLog.timestamp = new Date()
    isValid = false
    validationIssues.push(`Invalid timestamp type "${typeof actualLog.timestamp}" - replaced with current time`)
  }

  // Validate level
  const validLevels: LogLevel[] = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']
  if (!actualLog.level || typeof actualLog.level !== 'string' || !validLevels.includes(actualLog.level as LogLevel)) {
    console.warn('[LOG_ENTRY] Invalid log level detected:', actualLog.level)
    validatedLog.level = 'INFO'
    isValid = false
    validationIssues.push(`Invalid log level "${actualLog.level}" - replaced with INFO`)
  } else {
    validatedLog.level = actualLog.level as LogLevel
  }

  // Validate message
  if (!actualLog.message || typeof actualLog.message !== 'string') {
    console.warn('[LOG_ENTRY] Invalid message detected:', actualLog.message)
    validatedLog.message = typeof actualLog.message !== 'undefined' 
      ? String(actualLog.message) 
      : 'No message provided'
    isValid = false
    validationIssues.push('Invalid or missing message - replaced with fallback')
  } else {
    validatedLog.message = actualLog.message
  }

  // Validate tags
  if (!actualLog.tags || !Array.isArray(actualLog.tags)) {
    console.warn('[LOG_ENTRY] Invalid tags detected:', actualLog.tags)
    validatedLog.tags = []
    isValid = false
    validationIssues.push('Invalid tags array - replaced with empty array')
  } else {
    // Validate individual tags and filter out invalid ones
    const validTags = actualLog.tags.filter((tag): tag is string => 
      typeof tag === 'string' && tag.trim() !== ''
    )
    if (validTags.length !== actualLog.tags.length) {
      console.warn('[LOG_ENTRY] Some invalid tag items detected:', actualLog.tags)
      isValid = false
      validationIssues.push('Some invalid tag items removed')
    }
    validatedLog.tags = validTags
  }

  // Validate source (optional field)
  if (actualLog.source !== undefined) {
    if (typeof actualLog.source !== 'string') {
      console.warn('[LOG_ENTRY] Invalid source detected:', actualLog.source)
      validatedLog.source = String(actualLog.source)
      isValid = false
      validationIssues.push('Invalid source type - converted to string')
    } else {
      validatedLog.source = actualLog.source
    }
  }

  // Validate metadata (optional field)
  if (actualLog.metadata !== undefined) {
    if (typeof actualLog.metadata !== 'object' || actualLog.metadata === null) {
      console.warn('[LOG_ENTRY] Invalid metadata detected:', actualLog.metadata)
      validatedLog.metadata = { originalMetadata: actualLog.metadata }
      isValid = false
      validationIssues.push('Invalid metadata - wrapped in fallback object')
    } else {
      validatedLog.metadata = actualLog.metadata
    }
  }

  if (!isValid) {
    console.warn('[LOG_ENTRY] Log entry validation issues found:', validationIssues.join(', '))
  }

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
    const isLevelActive = filters.levels.includes(validatedLog.level) && filters.levels.length === 1
    if (isLevelActive) {
      updateFilter({ levels: [] })
    } else {
      updateFilter({ levels: [validatedLog.level] })
    }
  }

  const handleEntryClick = () => {
    toggleEntryExpansion(validatedLog.id)
  }

  return (
    <div
      className={`log-entry px-3 ${isExpanded ? 'py-2' : 'py-1.5'} border-l-2 cursor-pointer group relative font-mono text-xs leading-tight
        ${levelColors[validatedLog.level]} hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-150`}
      onClick={handleEntryClick}
    >
      {/* First row: metadata and truncated message */}
      <div className="flex items-center gap-2">
        {/* Timestamp - fixed width for alignment */}
        <div className="text-text-secondary font-mono flex-shrink-0 w-16 text-[11px]">
          {formatTime(validatedLog.timestamp)}
        </div>

        {/* Level badge - compact and clickable */}
        <button
          onClick={handleLevelClick}
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 min-w-[40px] text-center transition-all duration-150 hover:scale-105 cursor-pointer ${levelColors[validatedLog.level]}
            ${filters.levels.includes(validatedLog.level) && filters.levels.length === 1 ? 'ring-2 ring-white/30' : 'hover:brightness-110'}`}
          title={`Click to ${filters.levels.includes(validatedLog.level) && filters.levels.length === 1 ? 'remove' : 'add'} level filter`}
        >
          {validatedLog.level}
        </button>

        {/* Tags - compact */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {validatedLog.tags && validatedLog.tags.map((tag, index) => {
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
            {validatedLog.message.replace(/\s*\/[^\s]*\/demo\.log\s*$/, '')}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Error indicator - always visible if there are validation issues */}
          {!isValid && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowErrorModal(true)
              }}
              className="p-1 hover:bg-orange-500/20 rounded text-orange-500 hover:text-orange-400 transition-colors"
              title="Log Rendering Error - Click for details"
            >
              <AlertTriangle className="w-3 h-3" />
            </button>
          )}
          
          {/* Copy action */}
          <div className={`${!isValid ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                copyToClipboard(validatedLog.message.replace(/\s*\/[^\s]*\/demo\.log\s*$/, ''))
              }}
              className="p-1 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary transition-colors"
              title="Copy message"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Second row: expanded content spanning full width */}
      {isExpanded && (
        <div className="mt-2">
          {/* Full message content spanning full width */}
          <div className="text-[11px] font-mono whitespace-pre-wrap break-words bg-black/10 p-2 rounded border border-white/10">
            {validatedLog.message.replace(/\s*\/[^\s]*\/demo\.log\s*$/, '')}
          </div>
          
          {/* Metadata below message if present */}
          {validatedLog.metadata && (
            <div className="mt-2 text-[10px] text-text-secondary bg-black/5 p-2 rounded border border-white/5">
              <div className="font-medium text-text-primary mb-1">Metadata:</div>
              {Object.entries(validatedLog.metadata).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium">{key}:</span> {String(value)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error Modal */}
      {!isValid && (
        <ErrorModal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          originalData={originalData}
          errorMessage={validationIssues.join('; ')}
        />
      )}
    </div>
  )
}

export default LogEntry