import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'path'
import { LogTailer } from './LogTailer'
import { LogParser } from './LogParser'
import { LogEntry } from './types'
import * as net from 'net'

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests from localhost on any port (for development and production)
      if (!origin || /^https?:\/\/localhost:\d+$/.test(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
})

// Helper function to check if a port is available
const isPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer()
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true)
      })
      server.close()
    })
    
    server.on('error', () => {
      resolve(false)
    })
  })
}

// Helper function to find an available port
const findAvailablePort = async (startPort: number): Promise<number> => {
  for (let port = startPort; port <= startPort + 100; port++) {
    if (await isPortAvailable(port)) {
      return port
    }
  }
  // If no port found in range, try random ports
  for (let i = 0; i < 50; i++) {
    const randomPort = Math.floor(Math.random() * (65535 - 3000)) + 3000
    if (await isPortAvailable(randomPort)) {
      return randomPort
    }
  }
  throw new Error('No available port found')
}

const REQUESTED_PORT = parseInt(process.env.PORT || '3001', 10)
const AUTO_TAIL_FILE = process.env.LOGUI_FILE
const logTailers = new Map<string, LogTailer>()
const logParser = new LogParser()
// Track which sockets are listening to which files
const socketFileMap = new Map<string, Set<string>>() // socketId -> Set<filePath>
const fileSocketMap = new Map<string, Set<string>>() // filePath -> Set<socketId>

console.log(`[SERVER] Initializing LogUI server...`)
console.log(`[SERVER] LogTailers map initialized with ${logTailers.size} entries`)
console.log(`[SERVER] Socket tracking maps initialized`)
console.log(`[SERVER] LogParser initialized`)
if (AUTO_TAIL_FILE) {
  console.log(`[SERVER] Auto-tail file specified: ${AUTO_TAIL_FILE}`)
}

// Serve static files for published version
app.use(express.static(path.join(__dirname, '../client')))

// Serve sample log files from samples directory
const fs = require('fs')

// API to list available sample files
app.get('/api/samples', (req, res) => {
  try {
    const samplesDir = path.join(__dirname, '../../samples')
    const files = fs.readdirSync(samplesDir)
    const logFiles = files.filter((file: string) => file.endsWith('.log'))
    
    const fileInfo = logFiles.map((file: string) => {
      const filePath = path.join(samplesDir, file)
      const stats = fs.statSync(filePath)
      return {
        name: file,
        size: stats.size,
        modified: stats.mtime
      }
    })
    
    res.json(fileInfo)
  } catch (error) {
    console.error('[API] Error listing sample files:', error)
    res.status(500).json({ error: 'Failed to list sample files' })
  }
})

// Serve individual sample files dynamically
app.get('/api/samples/:filename', (req, res) => {
  try {
    const filename = req.params.filename
    // Security: only allow .log files and prevent directory traversal
    if (!filename.endsWith('.log') || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' })
    }
    
    const filePath = path.join(__dirname, '../../samples', filename)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' })
    }
    
    res.sendFile(path.resolve(filePath))
  } catch (error) {
    console.error(`[API] Error serving sample file ${req.params.filename}:`, error)
    res.status(500).json({ error: 'Failed to serve sample file' })
  }
})
app.get('/api*', (req, res, next) => {
  // Let API routes pass through
  next()
})
app.get('*', (_, res) => {
  // Serve React app for all non-API routes
  const indexPath = path.join(__dirname, '../client/index.html')
  console.log(`[SERVER] Serving index.html from: ${indexPath}`)
  res.sendFile(indexPath)
})

// API Routes
app.get('/api/health', (_, res) => {
  console.log(`[API] Health check requested`)
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

app.get('/.logui-port', (_, res) => {
  console.log(`[API] Port file requested`)
  try {
    const port = require('fs').readFileSync('.logui-port', 'utf8')
    res.send(port)
  } catch (error) {
    console.log(`[API] Port file not found, sending default`)
    res.send('3001')
  }
})

// Start server with port detection
const startServer = async () => {
  try {
    console.log(`[SERVER] Checking if port ${REQUESTED_PORT} is available...`)
    let PORT = REQUESTED_PORT
    
    if (!(await isPortAvailable(REQUESTED_PORT))) {
      console.log(`[SERVER] Port ${REQUESTED_PORT} is busy, finding alternative...`)
      PORT = await findAvailablePort(REQUESTED_PORT + 1)
      console.log(`[SERVER] Found available port: ${PORT}`)
    }
    
    server.listen(PORT, () => {
      console.log(`[SERVER] LogUI server running on port ${PORT}`)
      console.log(`[SERVER] Socket.IO server initialized with CORS enabled`)
      
      // Write the actual port to a file so the CLI can read it
      require('fs').writeFileSync('.logui-port', PORT.toString())
    })
    
  } catch (error) {
    console.error(`[SERVER] Failed to start server:`, error)
    process.exit(1)
  }
}

startServer()

// Handle stdin (for piped input)
let hasStdinData = false
let stdinBuffer = ''

console.log(`[STDIN] Setting up stdin handling...`)

// Check if stdin has data
process.stdin.setEncoding('utf8')

// Set a timeout to detect if we have piped input
const stdinTimeout = setTimeout(() => {
  console.log(`[STDIN] No stdin data detected within timeout, continuing normally`)
}, 100)

process.stdin.on('readable', () => {
  hasStdinData = true
  clearTimeout(stdinTimeout)
  console.log(`[STDIN] Stdin data detected, setting up streaming...`)
  
  let chunk
  while ((chunk = process.stdin.read()) !== null) {
    stdinBuffer += chunk
    const lines = stdinBuffer.split('\n')
    
    // Process complete lines
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim()
      if (line) {
        console.log(`[STDIN] Processing line: ${line.substring(0, 100)}...`)
        // Emit to all connected sockets
        const logEntry = logParser.parseLine(line, 'stdin')
        if (logEntry) {
          console.log(`[STDIN] Emitting log entry to ${io.sockets.sockets.size} connected clients`)
          io.sockets.sockets.forEach((clientSocket) => {
            clientSocket.emit('log:entry', logEntry)
          })
        }
      }
    }
    
    // Keep the last incomplete line
    stdinBuffer = lines[lines.length - 1]
  }
})

process.stdin.on('end', () => {
  console.log(`[STDIN] Stdin stream ended`)
  // Process any remaining content in buffer
  if (stdinBuffer.trim()) {
    console.log(`[STDIN] Processing final buffer content: ${stdinBuffer.trim().substring(0, 100)}...`)
    const logEntry = logParser.parseLine(stdinBuffer.trim(), 'stdin')
    if (logEntry) {
      console.log(`[STDIN] Emitting final log entry to ${io.sockets.sockets.size} connected clients`)
      io.sockets.sockets.forEach((clientSocket) => {
        clientSocket.emit('log:entry', logEntry)
      })
    }
  }
})

// Helper function to add socket to file tracking
const addSocketToFile = (socketId: string, filePath: string) => {
  if (!socketFileMap.has(socketId)) {
    socketFileMap.set(socketId, new Set())
  }
  socketFileMap.get(socketId)!.add(filePath)
  
  if (!fileSocketMap.has(filePath)) {
    fileSocketMap.set(filePath, new Set())
  }
  fileSocketMap.get(filePath)!.add(socketId)
  
  console.log(`[SOCKET] Added socket ${socketId} to file ${filePath}. Listeners: ${fileSocketMap.get(filePath)!.size}`)
}

// Helper function to remove socket from file tracking
const removeSocketFromFile = (socketId: string, filePath: string) => {
  if (socketFileMap.has(socketId)) {
    socketFileMap.get(socketId)!.delete(filePath)
    if (socketFileMap.get(socketId)!.size === 0) {
      socketFileMap.delete(socketId)
    }
  }
  
  if (fileSocketMap.has(filePath)) {
    fileSocketMap.get(filePath)!.delete(socketId)
    const remainingListeners = fileSocketMap.get(filePath)!.size
    console.log(`[SOCKET] Removed socket ${socketId} from file ${filePath}. Remaining listeners: ${remainingListeners}`)
    
    if (remainingListeners === 0) {
      console.log(`[SOCKET] No more listeners for ${filePath}, stopping tailer`)
      fileSocketMap.delete(filePath)
      
      if (filePath === 'stdin') {
        console.log(`[SOCKET] No more listeners for stdin, marking stdin as inactive`)
        // For stdin, we can't really stop it, but we can mark it as inactive
      } else {
        const tailer = logTailers.get(filePath)
        if (tailer) {
          tailer.stop()
          logTailers.delete(filePath)
          console.log(`[SOCKET] Stopped and removed tailer for ${filePath}`)
        }
      }
    }
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`)
  console.log(`[SOCKET] Total connected clients: ${io.sockets.sockets.size}`)
  
  // Set up keep-alive ping
  const pingInterval = setInterval(() => {
    if (socket.connected) {
      console.log(`[SOCKET] Sending ping to client ${socket.id}`)
      socket.emit('ping')
    }
  }, 30000) // Send ping every 30 seconds
  
  // If we detected stdin data, automatically add stdin as a source
  if (hasStdinData) {
    console.log(`[SOCKET] Adding stdin source for client ${socket.id}`)
    addSocketToFile(socket.id, 'stdin')
    const sourceInfo = {
      id: 'stdin',
      name: 'stdin',
      path: 'stdin',
      isActive: true,
      color: '#5E6AD2',
      entryCount: 0,
      lastActivity: new Date()
    }
    socket.emit('source:added', sourceInfo)
    console.log(`[SOCKET] Emitted source:added for stdin to client ${socket.id}`)
  }

  // If auto-tail file is specified, start tailing it automatically
  if (AUTO_TAIL_FILE) {
    console.log(`[SOCKET] Auto-starting tail for ${AUTO_TAIL_FILE} on client connection`)
    setTimeout(async () => {
      try {
        console.log(`[SOCKET] Directly starting auto-tail for ${AUTO_TAIL_FILE}`)
        // Call the same logic as the tail:start handler
        await startTailing(socket, AUTO_TAIL_FILE)
      } catch (error) {
        console.error(`[SOCKET] Error auto-starting tail:`, error)
      }
    }, 100)
  }

  socket.on('pong', () => {
    // Client responded to ping, connection is alive
    console.log(`[SOCKET] Client ${socket.id} ping response received`)
  })


  socket.on('error', (error) => {
    console.error(`[SOCKET] Socket error for client ${socket.id}:`, error)
  })

  // Extract tailing logic into reusable function
  const startTailing = async (targetSocket: any, filePath: string) => {
    console.log(`[SOCKET] Starting to tail: ${filePath}`)
    console.log(`[SOCKET] Current logTailers: ${Array.from(logTailers.keys()).join(', ')}`)
    
    // Add this socket as a listener for this file
    addSocketToFile(targetSocket.id, filePath)
    
    if (logTailers.has(filePath)) {
      console.log(`[SOCKET] Already tailing ${filePath}, just adding socket as listener`)
      return
    }

    console.log(`[SOCKET] Creating new LogTailer for ${filePath}`)
    const tailer = new LogTailer(filePath)
    logTailers.set(filePath, tailer)
    console.log(`[SOCKET] Added tailer to map, total tailers: ${logTailers.size}`)

    // Send source added event
    const sourceInfo = {
      id: filePath,
      name: path.basename(filePath),
      path: filePath,
      isActive: true,
      color: '#5E6AD2',
      entryCount: 0,
      lastActivity: new Date()
    }
    console.log(`[SOCKET] Emitting source:added:`, sourceInfo)
    targetSocket.emit('source:added', sourceInfo)

    const initialLines: Array<{content: string, isAppend: boolean}> = []
    const lineHandler = (lineData: {content: string, isAppend: boolean} | string) => {
      try {
        // Handle both old string format and new object format for compatibility
        const data = typeof lineData === 'string' ? {content: lineData, isAppend: false} : lineData
        console.log(`[TAILER] Received line from ${filePath} (${data.isAppend ? 'APPEND' : 'NEW'}): ${data.content.substring(0, 100)}...`)
        
        if (data.isAppend) {
          console.log(`[TAILER] Emitting log:append`)
          targetSocket.emit('log:append', data.content)
        } else {
          const logEntry = logParser.parseLine(data.content, filePath)
          if (logEntry) {
            console.log(`[TAILER] Parsed log entry: ${logEntry.level} - ${logEntry.message.substring(0, 50)}...`)
            console.log(`[TAILER] Emitting log:entry`)
            targetSocket.emit('log:entry', logEntry)
          } else {
            console.log(`[TAILER] Failed to parse line from ${filePath}`)
          }
        }
      } catch (error) {
        console.error(`[TAILER] Error processing log line from ${filePath}:`, error)
      }
    }

    const initialBatchHandler = (lineData: {content: string, isAppend: boolean} | string) => {
      const data = typeof lineData === 'string' ? {content: lineData, isAppend: false} : lineData
      initialLines.push(data)
    }

    tailer.once('end', () => {
      console.log(`[TAILER] Initial read ended for ${filePath}, sending batch of ${initialLines.length} lines`)
      
      // Process initial lines with append logic - create consolidated LogEntry objects
      const processedEntries: LogEntry[] = []
      
      for (const lineData of initialLines) {
        if (!lineData.isAppend) {
          // New log entry
          const logEntry = logParser.parseLine(lineData.content, filePath)
          if (logEntry) {
            processedEntries.push(logEntry)
          }
        } else {
          // Append to last entry if exists
          if (processedEntries.length > 0) {
            const lastEntry = processedEntries[processedEntries.length - 1]
            lastEntry.message = lastEntry.message + '\n' + lineData.content
          }
          // If no entries to append to, skip this line
        }
      }
      
      console.log(`[TAILER] Created batch of ${processedEntries.length} processed entries.`)
      
      if (processedEntries.length > 0) {
        console.log(`[TAILER] Emitting log:batch of ${processedEntries.length} entries`)
        targetSocket.emit('log:batch', processedEntries)
      } else {
        console.log(`[TAILER] Log batch is empty, not emitting.`)
      }
      
      tailer.off('line', initialBatchHandler)
      tailer.on('line', lineHandler)
    })

    tailer.on('line', initialBatchHandler)

    // Handle errors
    tailer.on('error', (error: Error) => {
      console.error(`[TAILER] Error tailing ${filePath}:`, error)
      // Don't emit error to client as it might cause disconnection
      // Just log it and continue
    })

    console.log(`[SOCKET] Starting tailer for ${filePath}...`)
    await tailer.start()
    console.log(`[SOCKET] Successfully started tailing ${filePath}`)
  }

  socket.on('tail:start', async (filePath: string) => {
    console.log(`[SOCKET] Client ${socket.id} requested to tail: ${filePath}`)
    const isampleFile = filePath.includes('sample.log')
    const isDemoFile = filePath.includes('demo.log')
    
    if (isampleFile) {
      console.log(`[SOCKET] Processing SAMPLE LOG file request for: ${filePath}`)
    } else if (isDemoFile) {
      console.log(`[SOCKET] Processing DEMO LOG file request for: ${filePath}`)
    } else {
      console.log(`[SOCKET] Processing regular file tail request for: ${filePath}`)
    }
    
    try {
      await startTailing(socket, filePath)
      console.log(`[SOCKET] Successfully completed tail:start request for ${filePath}`)
    } catch (error) {
      console.error(`[SOCKET] Error starting tail for ${filePath}:`, error)
      socket.emit('error', { message: 'Failed to start tailing file' })
    }
  })

  socket.on('file:upload', (fileData: { name: string, size: number, lines: string[] }) => {
    console.log(`[SOCKET] Client ${socket.id} uploaded file: ${fileData.name} (${fileData.size} bytes, ${fileData.lines.length} lines)`)
    
    const fileId = `upload:${fileData.name}`
    addSocketToFile(socket.id, fileId)
    
    // Send source added event
    const sourceInfo = {
      id: fileId,
      name: fileData.name,
      path: fileData.name,
      isActive: true,
      color: '#5E6AD2',
      entryCount: fileData.lines.length,
      lastActivity: new Date()
    }
    console.log(`[SOCKET] Emitting source:added for uploaded file:`, sourceInfo)
    socket.emit('source:added', sourceInfo)

    // Process all lines and send as direct LogEntry array (same as file tailing)
    const processedEntries = fileData.lines.map(line => {
      return logParser.parseLine(line, fileId)
    }).filter(entry => entry !== null) as LogEntry[]

    console.log(`[SOCKET] Processed ${processedEntries.length} log entries from uploaded file`)
    
    if (processedEntries.length > 0) {
      console.log(`[SOCKET] Emitting log:batch of ${processedEntries.length} entries`)
      socket.emit('log:batch', processedEntries)
    }
  })

  socket.on('tail:stop', (filePath: string) => {
    console.log(`[SOCKET] Client ${socket.id} requested to stop tailing: ${filePath}`)
    removeSocketFromFile(socket.id, filePath)
    socket.emit('source:removed', filePath)
    console.log(`[SOCKET] Removed socket from file tracking for ${filePath}, total tailers: ${logTailers.size}`)
  })

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`)
    console.log(`[SOCKET] Total connected clients: ${io.sockets.sockets.size}`)
    
    // Clean up all files this socket was listening to
    const listeningFiles = socketFileMap.get(socket.id)
    if (listeningFiles) {
      console.log(`[SOCKET] Cleaning up ${listeningFiles.size} files for disconnected socket ${socket.id}`)
      // Make a copy of the set to avoid modification during iteration
      const filesToCleanup = Array.from(listeningFiles)
      for (const filePath of filesToCleanup) {
        removeSocketFromFile(socket.id, filePath)
      }
    }
    
    clearInterval(pingInterval)
  })
})

// Handle process termination
let isShuttingDown = false

const cleanup = async () => {
  if (isShuttingDown) {
    console.log(`[SERVER] Already shutting down, forcing exit...`)
    process.exit(1)
  }
  
  isShuttingDown = true
  console.log(`[SERVER] Shutting down gracefully...`)
  
  try {
    // Stop all tailers first
    console.log(`[SERVER] Stopping ${logTailers.size} active tailers...`)
    const tailerPromises = []
    for (const [filePath, tailer] of logTailers.entries()) {
      console.log(`[SERVER] Stopping tailer for ${filePath}`)
      tailer.stop()
    }
    logTailers.clear()
    
    // Close Socket.IO connections
    console.log(`[SERVER] Closing Socket.IO connections...`)
    io.close()
    
    // Clean up port file
    try {
      require('fs').unlinkSync('.logui-port')
    } catch (error) {
      // Ignore if file doesn't exist
    }
    
    // Close HTTP server with timeout
    console.log(`[SERVER] Closing HTTP server...`)
    const serverClosePromise = new Promise((resolve) => {
      server.close(() => {
        console.log(`[SERVER] HTTP server closed`)
        resolve(true)
      })
    })
    
    // Force close after 2 seconds
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[SERVER] Force closing after timeout`)
        resolve(true)
      }, 2000)
    })
    
    await Promise.race([serverClosePromise, timeoutPromise])
    
  } catch (error) {
    console.error(`[SERVER] Error during cleanup:`, error)
  } finally {
    console.log(`[SERVER] Shutdown complete`)
    process.exit(0)
  }
}

process.on('SIGTERM', cleanup)
process.on('SIGINT', cleanup)
process.on('SIGQUIT', cleanup)

// Force exit after 5 seconds if graceful shutdown fails
process.on('SIGINT', () => {
  setTimeout(() => {
    console.log(`[SERVER] Force exit after 5 seconds`)
    process.exit(1)
  }, 5000).unref()
})

export default app