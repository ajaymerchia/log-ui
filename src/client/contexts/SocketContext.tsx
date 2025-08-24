import React, { createContext, useContext, useEffect, useRef, useCallback, ReactNode, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useLogStore } from '../store/useLogStore'
import { LogEntry, LogSource } from '../types'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType | null>(null)

export const useSocketContext = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: ReactNode
}

// Create singleton socket instance outside React lifecycle
let globalSocket: Socket | null = null

const getSocket = (): Socket => {
  if (!globalSocket) {
    console.log('[SOCKET_CONTEXT] Creating singleton socket...')
    
    // Determine server URL
    let serverUrl: string
    if (window.location.origin.includes('localhost:5173') || window.location.origin.includes('localhost:5174') || window.location.origin.includes('localhost:5175')) {
      // Development mode - check for server_port query parameter
      const urlParams = new URLSearchParams(window.location.search)
      const serverPort = urlParams.get('server_port')
      
      if (serverPort) {
        serverUrl = `http://localhost:${serverPort}`
        console.log('[SOCKET_CONTEXT] Using server port from query parameter:', serverPort)
      } else {
        console.log('[SOCKET_CONTEXT] No server_port query parameter found, falling back to 3001')
        serverUrl = 'http://localhost:3001'
      }
    } else {
      serverUrl = window.location.origin // Production mode
    }
    
    console.log('[SOCKET_CONTEXT] Creating socket with URL:', serverUrl)
    
    globalSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      forceNew: false, // Reuse existing connection
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
  }
  
  return globalSocket
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const socket = getSocket() // Always return the same singleton
  const [isConnected, setIsConnected] = useState(false)
  const { 
    addLog, 
    addLogs, 
    appendToLastLog,
    setConnected, 
    addSource, 
    removeSource, 
    clearLogsFromSource,
    addToast,
  } = useLogStore()

  // Memoize the event handlers to prevent recreation
  const handleLogEntry = useCallback((entry: LogEntry) => {
    console.log('[SOCKET_CONTEXT] Received log entry:', entry)
    const processedEntry = {
      ...entry,
      timestamp: new Date(entry.timestamp), // Ensure Date object
    }
    
    addLog(processedEntry)
  }, [addLog])

  const handleLogBatch = useCallback((entries: LogEntry[]) => {
    console.log('[SOCKET_CONTEXT] Received log batch:', entries.length, 'entries')
    
    // Process entries - ensure timestamps are Date objects
    const processedEntries = entries.map(entry => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    }))
    
    addLogs(processedEntries)
  }, [addLogs])

  const handleLogAppend = useCallback((content: string) => {
    console.log('[SOCKET_CONTEXT] Received log append:', content.substring(0, 50), '...')
    appendToLastLog(content)
  }, [appendToLastLog])

  const handleSourceAdded = useCallback((source: LogSource) => {
    console.log('[SOCKET_CONTEXT] Source added:', source)
    addSource(source)
  }, [addSource])

  const handleSourceRemoved = useCallback((sourceId: string) => {
    console.log('[SOCKET_CONTEXT] Source removed:', sourceId)
    removeSource(sourceId)
  }, [removeSource])

  const handleConnectionStatus = useCallback((connected: boolean) => {
    console.log('[SOCKET_CONTEXT] Connection status update:', connected)
    setConnected(connected)
    setIsConnected(connected)
  }, [setConnected])

  const handlePing = useCallback(() => {
    console.log('[SOCKET_CONTEXT] Ping received from server, sending pong')
    socket.emit('pong')
  }, [socket])

  const handleFileCleared = useCallback((data: { filePath: string, success: boolean, error?: string }) => {
    console.log('[SOCKET_CONTEXT] File cleared response:', data)
    if (data.success) {
      clearLogsFromSource(data.filePath)
      addToast(`File cleared successfully: ${data.filePath}`, 'success', 3000)
    } else {
      addToast(`Failed to clear file: ${data.error || 'Unknown error'}`, 'error', 5000)
    }
  }, [clearLogsFromSource, addToast])

  useEffect(() => {
    console.log('[SOCKET_CONTEXT] Setting up socket event listeners...')

    // Connection events
    socket.on('connect', () => {
      console.log('[SOCKET_CONTEXT] Connected to server:', socket.id)
      setConnected(true)
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('[SOCKET_CONTEXT] Disconnected from server')
      setConnected(false)
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('[SOCKET_CONTEXT] Connection error:', error)
      setConnected(false)
      setIsConnected(false)
    })

    // Log events
    socket.on('log:entry', handleLogEntry)
    socket.on('log:batch', handleLogBatch)
    socket.on('log:append', handleLogAppend)

    // Source events
    socket.on('source:added', handleSourceAdded)
    socket.on('source:removed', handleSourceRemoved)
    socket.on('connection:status', handleConnectionStatus)

    // Keep-alive ping/pong
    socket.on('ping', handlePing)

    // File operations
    socket.on('file:cleared', handleFileCleared)

    // Cleanup function
    return () => {
      console.log('[SOCKET_CONTEXT] Cleaning up socket event listeners')
      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
      socket.off('log:entry', handleLogEntry)
      socket.off('log:batch', handleLogBatch)
      socket.off('log:append', handleLogAppend)
      socket.off('source:added', handleSourceAdded)
      socket.off('source:removed', handleSourceRemoved)
      socket.off('connection:status', handleConnectionStatus)
      socket.off('ping', handlePing)
      socket.off('file:cleared', handleFileCleared)
    }
  }, [socket, handleLogEntry, handleLogBatch, handleLogAppend, handleSourceAdded, handleSourceRemoved, handleConnectionStatus, handlePing, handleFileCleared])
  
  // Don't disconnect the singleton socket on component unmount
  // It should persist across React re-mounts

  const value: SocketContextType = {
    socket: socket,
    isConnected: isConnected
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
} 