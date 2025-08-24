export interface LogEntry {
  id: string
  timestamp: Date | string // Allow string for JSON serialization, will be validated/converted in component
  level: LogLevel
  message: string
  tags: string[]
  source?: string
  metadata?: Record<string, any>
}

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE'

export interface LogFilter {
  levels: LogLevel[]
  tags: string[]
  search: string
  timeRange: TimeRange | null
  sources: string[]
}

export interface TimeRange {
  start: Date
  end: Date
}

export interface LogSource {
  id: string
  name: string
  path: string
  isActive: boolean
  color: string
  lastActivity?: Date
  entryCount: number
}

export interface AppState {
  logs: LogEntry[]
  sources: LogSource[]
  filters: LogFilter
  isConnected: boolean
  autoScroll: boolean
  selectedEntry: LogEntry | null
}

export interface SocketEvents {
  'log:entry': (entry: LogEntry) => void
  'log:batch': (entries: LogEntry[]) => void
  'source:added': (source: LogSource) => void
  'source:removed': (sourceId: string) => void
  'connection:status': (connected: boolean) => void
}