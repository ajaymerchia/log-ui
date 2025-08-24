import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { LogEntry, LogFilter, LogSource, LogLevel } from '../types'

interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

interface LogStore {
  logs: LogEntry[]
  sources: LogSource[]
  filters: LogFilter
  isConnected: boolean
  autoScroll: boolean
  selectedEntry: LogEntry | null
  filteredLogs: LogEntry[] // Now a state property
  isSidebarCollapsed: boolean
  isMobileSidebarOpen: boolean
  expandedEntries: Set<string>
  toasts: ToastMessage[]
  isDarkMode: boolean
  
  // Actions
  addLog: (log: LogEntry) => void
  addLogs: (logs: LogEntry[]) => void
  appendToLastLog: (content: string) => void
  clearLogs: () => void
  setConnected: (connected: boolean) => void
  setAutoScroll: (autoScroll: boolean) => void
  setSelectedEntry: (entry: LogEntry | null) => void
  updateFilter: (filter: Partial<LogFilter>) => void
  addSource: (source: LogSource) => void
  removeSource: (sourceId: string) => void
  toggleSource: (sourceId: string) => void
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
  toggleEntryExpansion: (entryId: string) => void
  addToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void
  removeToast: (id: string) => void
  toggleDarkMode: () => void
}

const initialFilter: LogFilter = {
  levels: [],
  tags: [],
  search: '',
  timeRange: null,
  sources: []
}

const filterLogs = (logs: LogEntry[], filters: LogFilter): LogEntry[] => {
  console.log('[STORE_FILTER] Running filter calculation:', {
    totalLogs: logs.length,
    filters,
  });

  const filtered = logs.filter((log) => {
    // Filter by levels
    if (filters.levels.length > 0 && !filters.levels.includes(log.level)) {
      return false
    }
    
    // Filter by tags
    if (filters.tags.length > 0 && !filters.tags.some(tag => log.tags.includes(tag))) {
      return false
    }
    
    // Filter by search
    if (filters.search && !log.message.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    
    // Filter by time range
    if (filters.timeRange) {
      const logTime = new Date(log.timestamp)
      if (logTime < filters.timeRange.start || logTime > filters.timeRange.end) {
        return false
      }
    }
    
    // Filter by sources
    if (filters.sources.length > 0 && log.source && !filters.sources.includes(log.source)) {
      console.log(`[STORE_FILTER] Filtering out log from source "${log.source}" because it's not in [${filters.sources.join(', ')}]`);
      return false
    }
    
    return true
  })

  console.log(`[STORE_FILTER] Filter calculation complete. ${filtered.length} logs passed.`);
  return filtered;
}

export const useLogStore = create<LogStore>()(
  devtools(
    (set, get) => ({
      logs: [],
      sources: [],
      filters: initialFilter,
      isConnected: false,
      autoScroll: true,
      selectedEntry: null,
      filteredLogs: [],
      isSidebarCollapsed: false,
      isMobileSidebarOpen: false,
      expandedEntries: new Set(),
      toasts: [],
      isDarkMode: typeof window !== 'undefined' ? localStorage.getItem('logui-dark-mode') !== 'false' : true, // Default to dark mode

      addLog: (log) =>
        set((state) => {
          const newLogs = [...state.logs, log].slice(-10000);
          return {
            logs: newLogs,
            filteredLogs: filterLogs(newLogs, state.filters),
          };
        }),

      addLogs: (logs) =>
        set((state) => {
          console.log(`[STORE] Before addLogs: ${state.logs.length} logs`);
          const newLogs = [...state.logs, ...logs].slice(-10000);
          console.log(`[STORE] After addLogs: ${newLogs.length} logs`);
          return {
            logs: newLogs,
            filteredLogs: filterLogs(newLogs, state.filters),
          };
        }),

      appendToLastLog: (content) =>
        set((state) => {
          if (state.logs.length === 0) {
            console.log(`[STORE] No logs to append to, ignoring append: ${content.substring(0, 50)}...`);
            return state;
          }

          const newLogs = [...state.logs];
          const lastLog = { ...newLogs[newLogs.length - 1] };
          lastLog.message = lastLog.message + '\n' + content;
          newLogs[newLogs.length - 1] = lastLog;

          console.log(`[STORE] Appended to last log: ${content.substring(0, 50)}...`);
          return {
            logs: newLogs,
            filteredLogs: filterLogs(newLogs, state.filters),
          };
        }),

      clearLogs: () => set({ logs: [], filteredLogs: [] }),

      setConnected: (connected) => set({ isConnected: connected }),


      setAutoScroll: (autoScroll) => set({ autoScroll }),

      setSelectedEntry: (entry) => set({ selectedEntry: entry }),

      updateFilter: (filter) =>
        set((state) => {
          const newFilters = { ...state.filters, ...filter };
          return {
            filters: newFilters,
            filteredLogs: filterLogs(state.logs, newFilters),
          };
        }),

      addSource: (source) =>
        set((state) => {
          console.log('[STORE] Before addSource:', {
            sources: state.sources,
            filters: state.filters,
          });
          const newSources = [...state.sources.filter(s => s.id !== source.id), source];
          const newActiveSources = newSources.filter(s => s.isActive).map(s => s.id);

          const newFilters = {
            ...state.filters,
            sources: newActiveSources,
          };
          
          const newState = {
            sources: newSources,
            filters: newFilters,
            filteredLogs: filterLogs(state.logs, newFilters),
          };
          console.log('[STORE] After addSource:', newState);
          return newState;
        }),

      removeSource: (sourceId) =>
        set((state) => {
          const newSources = state.sources.filter(s => s.id !== sourceId);
          const newActiveSources = newSources.filter(s => s.isActive).map(s => s.id);
          const newFilters = {
            ...state.filters,
            sources: newActiveSources,
          };
          return {
            sources: newSources,
            filters: newFilters,
            filteredLogs: filterLogs(state.logs, newFilters),
          };
        }),

      toggleSource: (sourceId) =>
        set((state) => {
          const newSources = state.sources.map(s =>
            s.id === sourceId ? { ...s, isActive: !s.isActive } : s
          );
          const newActiveSources = newSources.filter(s => s.isActive).map(s => s.id);
          const newFilters = {
            ...state.filters,
            sources: newActiveSources,
          };
          return {
            sources: newSources,
            filters: newFilters,
            filteredLogs: filterLogs(state.logs, newFilters),
          };
        }),

      toggleSidebar: () =>
        set((state) => ({
          isSidebarCollapsed: !state.isSidebarCollapsed,
        })),

      toggleMobileSidebar: () =>
        set((state) => ({
          isMobileSidebarOpen: !state.isMobileSidebarOpen,
        })),

      toggleEntryExpansion: (entryId: string) =>
        set((state) => {
          const newExpandedEntries = new Set(state.expandedEntries)
          if (newExpandedEntries.has(entryId)) {
            newExpandedEntries.delete(entryId)
          } else {
            newExpandedEntries.add(entryId)
          }
          return { expandedEntries: newExpandedEntries }
        }),

      addToast: (message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000) =>
        set((state) => {
          const id = Date.now().toString()
          const toast: ToastMessage = { id, message, type, duration }
          
          // Auto-remove toast after duration
          setTimeout(() => {
            get().removeToast(id)
          }, duration)
          
          return { toasts: [...state.toasts, toast] }
        }),

      removeToast: (id: string) =>
        set((state) => ({
          toasts: state.toasts.filter(toast => toast.id !== id)
        })),

      toggleDarkMode: () =>
        set((state) => {
          const newIsDarkMode = !state.isDarkMode
          // Save preference to localStorage
          localStorage.setItem('logui-dark-mode', newIsDarkMode.toString())
          // Apply theme to document
          if (newIsDarkMode) {
            document.documentElement.classList.add('dark')
            document.documentElement.classList.remove('light')
          } else {
            document.documentElement.classList.add('light')
            document.documentElement.classList.remove('dark')
          }
          return { isDarkMode: newIsDarkMode }
        }),
    }),
    {
      name: 'log-store',
    }
  )
)