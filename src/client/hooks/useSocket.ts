import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useLogStore } from '../store/useLogStore'
import { LogEntry, LogSource } from '../types'

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)
  const isInitializedRef = useRef(false)
  const { 
    addLog, 
    addLogs, 
    setConnected, 
    addSource, 
    removeSource, 
  } = useLogStore()

  // Memoize the event handlers to prevent recreation
  const handleLogEntry = useCallback((entry: LogEntry) => {
    console.log('[CLIENT] Received log entry:', entry)
    addLog({
      ...entry,
      timestamp: new Date(entry.timestamp), // Ensure Date object
    })
  }, [addLog])

  const handleLogBatch = useCallback((entries: LogEntry[]) => {
    console.log('[CLIENT] Received log batch:', entries.length, 'entries')
    addLogs(entries.map(entry => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    })))
  }, [addLogs])

  const handleSourceAdded = useCallback((source: LogSource) => {
    console.log('[CLIENT] Source added:', source)
    addSource(source)
  }, [addSource])

  const handleSourceRemoved = useCallback((sourceId: string) => {
    console.log('[CLIENT] Source removed:', sourceId)
    removeSource(sourceId)
  }, [removeSource])

  const handleConnectionStatus = useCallback((connected: boolean) => {
    console.log('[CLIENT] Connection status update:', connected)
    setConnected(connected)
  }, [setConnected])

  const handlePing = useCallback(() => {
    console.log('[CLIENT] Ping received from server, sending pong')
    if (socketRef.current) {
      socketRef.current.emit('pong')
    }
  }, [])

  useEffect(() => {
    // Only initialize once
    if (isInitializedRef.current) {
      console.log('[CLIENT] Socket already initialized, skipping...')
      return
    }

    console.log('[CLIENT] Initializing socket connection to server...')
    
    // Try to get the actual server port
    let serverPort = '3001'
    try {
      const response = await fetch('/.logui-port')
      if (response.ok) {
        serverPort = await response.text()
        console.log('[CLIENT] Found server port:', serverPort)
      }
    } catch (error) {
      console.log('[CLIENT] Could not read server port, using default 3001')
    }
    
    // Connect to server
    socketRef.current = io(`http://localhost:${serverPort}`, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    const socket = socketRef.current
    console.log('[CLIENT] Socket created with ID:', socket.id)
    isInitializedRef.current = true

    // Connection events
    socket.on('connect', () => {
      console.log('[CLIENT] Connected to server:', socket.id)
      setConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('[CLIENT] Disconnected from server')
      setConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('[CLIENT] Connection error:', error)
      setConnected(false)
    })

    // Log events
    socket.on('log:entry', handleLogEntry)
    socket.on('log:batch', handleLogBatch)

    // Source events
    socket.on('source:added', handleSourceAdded)
    socket.on('source:removed', handleSourceRemoved)
    socket.on('connection:status', handleConnectionStatus)

    // Keep-alive ping/pong
    socket.on('ping', handlePing)


    // Cleanup on unmount
    return () => {
      console.log('[CLIENT] Component unmounting, but keeping socket alive')
      // Don't disconnect on unmount - just remove listeners
      socket.off('log:entry', handleLogEntry)
      socket.off('log:batch', handleLogBatch)
      socket.off('source:added', handleSourceAdded)
      socket.off('source:removed', handleSourceRemoved)
      socket.off('connection:status', handleConnectionStatus)
      socket.off('ping', handlePing)
    }
  }, []) // Empty dependency array - only run once
  
  // Update event handlers when dependencies change (without recreating socket)
  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.off('log:entry', handleLogEntry)
      socketRef.current.off('log:batch', handleLogBatch)
      socketRef.current.off('source:added', handleSourceAdded)
      socketRef.current.off('source:removed', handleSourceRemoved)
      socketRef.current.off('connection:status', handleConnectionStatus)
      socketRef.current.off('ping', handlePing)
      
      socketRef.current.on('log:entry', handleLogEntry)
      socketRef.current.on('log:batch', handleLogBatch)
      socketRef.current.on('source:added', handleSourceAdded)
      socketRef.current.on('source:removed', handleSourceRemoved)
      socketRef.current.on('connection:status', handleConnectionStatus)
      socketRef.current.on('ping', handlePing)
    }
  }, [handleLogEntry, handleLogBatch, handleSourceAdded, handleSourceRemoved, handleConnectionStatus, handlePing])


  return socketRef.current
}