import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'
import { watch } from 'chokidar'
import { LogParser } from './LogParser'

export class LogTailer extends EventEmitter {
  private filePath: string
  private watcher: any
  private position: number = 0
  private isRunning: boolean = false
  private readStream: fs.ReadStream | null = null
  private logParser: LogParser = new LogParser()

  constructor(filePath: string) {
    super()
    this.filePath = path.resolve(filePath)
    console.log(`[LOGTAILER] Created LogTailer for: ${this.filePath}`)
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`[LOGTAILER] Already running for ${this.filePath}, skipping start`)
      return
    }

    console.log(`[LOGTAILER] Starting tailer for ${this.filePath}`)
    
    try {
      // Check if file exists
      console.log(`[LOGTAILER] Checking file access for ${this.filePath}`)
      await fs.promises.access(this.filePath, fs.constants.F_OK)
      console.log(`[LOGTAILER] File access confirmed for ${this.filePath}`)
      
      // Get initial file size
      const stats = await fs.promises.stat(this.filePath)
      this.position = Math.max(0, stats.size - 10000) // Start from last 10KB
      console.log(`[LOGTAILER] File size: ${stats.size} bytes, starting position: ${this.position}`)
      
      // Read initial content
      console.log(`[LOGTAILER] Reading initial content from position ${this.position}`)
      await this.readFromPosition(this.position)
      
      // Set up file watcher
      console.log(`[LOGTAILER] Setting up file watcher for ${this.filePath}`)
      this.watcher = watch(this.filePath, { 
        persistent: true,
        usePolling: process.platform === 'darwin', // macOS sometimes needs polling
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 100
        }
      })
      
      console.log(`[LOGTAILER] File watcher created for ${this.filePath}`)
      
      this.watcher.on('change', async () => {
        if (this.isRunning) {
          console.log(`[LOGTAILER] File change detected for ${this.filePath}`)
          try {
            await this.readNewContent()
          } catch (error) {
            console.error(`[LOGTAILER] Error reading new content from ${this.filePath}:`, error)
          }
        } else {
          console.log(`[LOGTAILER] File change ignored - tailer not running for ${this.filePath}`)
        }
      })
      
      this.watcher.on('error', (error: Error) => {
        console.error(`[LOGTAILER] Watcher error for ${this.filePath}:`, error)
        this.emit('error', error)
      })
      
      this.isRunning = true
      console.log(`[LOGTAILER] Successfully started tailing: ${this.filePath}`)
      
    } catch (error) {
      console.error(`[LOGTAILER] Failed to start tailing ${this.filePath}:`, error)
      this.emit('error', new Error(`Failed to start tailing ${this.filePath}: ${error}`))
    }
  }

  stop(): void {
    if (!this.isRunning) {
      console.log(`[LOGTAILER] Not running for ${this.filePath}, skipping stop`)
      return
    }

    console.log(`[LOGTAILER] Stopping tailer for ${this.filePath}`)
    this.isRunning = false
    
    // Remove all listeners to prevent memory leaks
    this.removeAllListeners()
    
    if (this.watcher) {
      try {
        console.log(`[LOGTAILER] Closing file watcher for ${this.filePath}`)
        this.watcher.removeAllListeners()
        this.watcher.close()
      } catch (error) {
        console.error(`[LOGTAILER] Error closing watcher for ${this.filePath}:`, error)
      }
      this.watcher = null
    }
    
    if (this.readStream) {
      try {
        console.log(`[LOGTAILER] Closing read stream for ${this.filePath}`)
        this.readStream.removeAllListeners()
        this.readStream.destroy()
      } catch (error) {
        console.error(`[LOGTAILER] Error closing read stream for ${this.filePath}:`, error)
      }
      this.readStream = null
    }
    
    console.log(`[LOGTAILER] Successfully stopped tailing: ${this.filePath}`)
  }

  private processLine(line: string, onEmit: () => void): void {
    if (!line.trim()) return // Skip empty lines
    
    const isNewEntry = this.logParser.isNewLogEntry(line.trim())
    const isAppend = !isNewEntry
    
    console.log(`[LOGTAILER] Processing line from ${this.filePath} (${isAppend ? 'APPEND' : 'NEW'}): ${line.substring(0, 100)}...`)
    this.emit('line', { content: line, isAppend })
    onEmit()
  }

  private async readNewContent(): Promise<void> {
    try {
      console.log(`[LOGTAILER] Reading new content for ${this.filePath} from position ${this.position}`)
      const stats = await fs.promises.stat(this.filePath)
      
      if (stats.size < this.position) {
        // File was truncated, start from beginning
        console.log(`[LOGTAILER] File ${this.filePath} was truncated, resetting position from ${this.position} to 0`)
        this.position = 0
      }
      
      if (stats.size > this.position) {
        console.log(`[LOGTAILER] Reading ${stats.size - this.position} new bytes from ${this.filePath}`)
        await this.readFromPosition(this.position)
      } else {
        console.log(`[LOGTAILER] No new content to read for ${this.filePath}`)
      }
      
    } catch (error) {
      console.error(`[LOGTAILER] Error reading new content from ${this.filePath}:`, error)
      this.emit('error', new Error(`Error reading file: ${error}`))
    }
  }

  private async readFromPosition(position: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[LOGTAILER] Creating read stream for ${this.filePath} from position ${position}`)
        const stream = fs.createReadStream(this.filePath, { 
          start: position,
          encoding: 'utf8'
        })
        
        let buffer = ''
        let lineCount = 0
        
        stream.on('data', (chunk: string | Buffer) => {
          try {
            const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString('utf8')
            buffer += chunkStr
            const lines = buffer.split('\n')
            
            // Process complete lines
            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i] // Don't trim yet - we need to preserve formatting
              this.processLine(line, () => {
                lineCount++
              })
            }
            
            // Keep the last incomplete line in buffer
            buffer = lines[lines.length - 1]
          } catch (error) {
            console.error(`[LOGTAILER] Error processing chunk from ${this.filePath}:`, error)
          }
        })
        
        stream.on('end', async () => {
          try {
            console.log(`[LOGTAILER] Read stream ended for ${this.filePath}, processed ${lineCount} lines`)
            
            // Process any remaining content in buffer
            if (buffer.trim()) {
              this.processLine(buffer, () => {
                lineCount++
              })
            }
            
            // Update position safely
            try {
              const stats = await fs.promises.stat(this.filePath)
              const oldPosition = this.position
              this.position = stats.size
              console.log(`[LOGTAILER] Updated position for ${this.filePath}: ${oldPosition} -> ${this.position}`)
            } catch (error) {
              console.error(`[LOGTAILER] Error updating position for ${this.filePath}:`, error)
              // Don't fail the entire operation if we can't update position
            }
            
            console.log(`[LOGTAILER] Emitting 'end' of initial read for ${this.filePath}`)
            this.emit('end')
            resolve()
          } catch (error) {
            console.error(`[LOGTAILER] Error in stream end handler for ${this.filePath}:`, error)
            this.emit('end') // Also emit 'end' on error to prevent hanging
            resolve() // Resolve anyway to prevent hanging
          }
        })
        
        stream.on('error', (error) => {
          console.error(`[LOGTAILER] Stream error for ${this.filePath}:`, error)
          reject(error)
        })
        
        // Store reference to stream for cleanup
        this.readStream = stream
        console.log(`[LOGTAILER] Read stream created and configured for ${this.filePath}`)
        
      } catch (error) {
        console.error(`[LOGTAILER] Error creating read stream for ${this.filePath}:`, error)
        reject(error)
      }
    })
  }
}