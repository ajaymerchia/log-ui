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

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const isInitializedRef = useRef(false)
  const { 
    addLog, 
    addLogs, 
    appendToLastLog,
    setConnected, 
    addSource, 
    removeSource, 
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

  const handleLogBatch = useCallback((entries: Array<{entry?: LogEntry, content: string, isAppend: boolean}> | LogEntry[]) => {
    console.log('[SOCKET_CONTEXT] Received log batch:', entries.length, 'entries')
    
    // Handle both old format (array of LogEntry) and new format (array with append flags)
    if (entries.length > 0 && 'entry' in entries[0]) {
      // New format with append handling
      const processedEntries = entries as Array<{entry?: LogEntry, content: string, isAppend: boolean}>
      
      for (const item of processedEntries) {
        if (item.isAppend) {
          appendToLastLog(item.content)
        } else if (item.entry) {
          const processedEntry = {
            ...item.entry,
            timestamp: new Date(item.entry.timestamp),
          }
          addLog(processedEntry)
        }
      }
    } else {
      // Old format (backward compatibility)
      const logEntries = entries as LogEntry[]
      const processedEntries = logEntries.map(entry => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }))
      
      addLogs(processedEntries)
    }
  }, [addLogs, addLog, appendToLastLog])

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
    if (socketRef.current) {
      socketRef.current.emit('pong')
    }
  }, [])

  useEffect(() => {
    // Only initialize once
    if (isInitializedRef.current || socketRef.current) {
      console.log('[SOCKET_CONTEXT] Socket already initialized, current socket:', !!socketRef.current)
      return
    }

    console.log('[SOCKET_CONTEXT] Initializing socket connection to server...')
    
    // Connect to server - use current window location in production, fallback to 3001 in dev
    const serverUrl = window.location.origin.includes('localhost:5173') 
      ? 'http://localhost:3001'  // Development mode (Vite dev server)
      : window.location.origin    // Production mode (same origin as frontend)
    
    console.log('[SOCKET_CONTEXT] Connecting to:', serverUrl)
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = newSocket
    setSocket(newSocket)
    console.log('[SOCKET_CONTEXT] Socket created, waiting for connection...')
    isInitializedRef.current = true

    // Connection events
    newSocket.on('connect', () => {
      console.log('[SOCKET_CONTEXT] Connected to server:', newSocket.id)
      setConnected(true)
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('[SOCKET_CONTEXT] Disconnected from server')
      setConnected(false)
      setIsConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('[SOCKET_CONTEXT] Connection error:', error)
      setConnected(false)
      setIsConnected(false)
    })

    // Log events
    newSocket.on('log:entry', handleLogEntry)
    newSocket.on('log:batch', handleLogBatch)
    newSocket.on('log:append', handleLogAppend)

    // Source events
    newSocket.on('source:added', handleSourceAdded)
    newSocket.on('source:removed', handleSourceRemoved)
    newSocket.on('connection:status', handleConnectionStatus)

    // Keep-alive ping/pong
    newSocket.on('ping', handlePing)

    // Cleanup on unmount
    return () => {
      console.log('[SOCKET_CONTEXT] App unmounting, disconnecting socket')
      newSocket.disconnect()
      socketRef.current = null
      setSocket(null)
      setIsConnected(false)
      isInitializedRef.current = false
    }
  }, []) // Empty dependency array - only run once
  
  // Update event handlers when dependencies change (without recreating socket)
  useEffect(() => {
    const currentSocket = socketRef.current
    if (currentSocket) {
      console.log('[SOCKET_CONTEXT] Updating event handlers for socket:', currentSocket.id)
      
      // Remove old handlers
      currentSocket.off('log:entry', handleLogEntry)
      currentSocket.off('log:batch', handleLogBatch)
      currentSocket.off('log:append', handleLogAppend)
      currentSocket.off('source:added', handleSourceAdded)
      currentSocket.off('source:removed', handleSourceRemoved)
      currentSocket.off('connection:status', handleConnectionStatus)
      currentSocket.off('ping', handlePing)
      
      // Add new handlers
      currentSocket.on('log:entry', handleLogEntry)
      currentSocket.on('log:batch', handleLogBatch)
      currentSocket.on('log:append', handleLogAppend)
      currentSocket.on('source:added', handleSourceAdded)
      currentSocket.on('source:removed', handleSourceRemoved)
      currentSocket.on('connection:status', handleConnectionStatus)
      currentSocket.on('ping', handlePing)
    }
  }, [handleLogEntry, handleLogBatch, handleLogAppend, handleSourceAdded, handleSourceRemoved, handleConnectionStatus, handlePing])


  const value: SocketContextType = {
    socket: socket,
    isConnected: isConnected
  }

  console.log('[SOCKET_CONTEXT] Providing context value:', { 
    hasSocket: !!socket, 
    isConnected, 
    socketId: socket?.id 
  })

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
} 