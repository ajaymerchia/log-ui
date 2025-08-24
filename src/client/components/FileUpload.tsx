import React, { useRef } from 'react'
import { Upload, File } from 'lucide-react'
import { useSocketContext } from '../contexts/SocketContext'

const FileUpload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { socket } = useSocketContext()

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      startTailing(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      startTailing(files[0])
    }
  }

  const startTailing = async (file: File) => {
    if (socket) {
      try {
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          if (content) {
            // Send the file content directly to be processed as logs
            const lines = content.split('\n').filter(line => line.trim())
            socket.emit('file:upload', {
              name: file.name,
              size: file.size,
              lines: lines
            })
          }
        }
        reader.readAsText(file)
      } catch (error) {
        console.error('[FILEUPLOAD] Error reading file:', error)
      }
    }
  }

  const handleSampleFile = () => {
    if (socket) {
      const filePath = '/Users/ajaymerchia/wkspc/logui/sample.log'
      socket.emit('tail:start', filePath)
    }
  }

  const handleDemoFile = () => {
    console.log('[FILEUPLOAD] Demo button clicked!')
    console.log('[FILEUPLOAD] Socket available:', !!socket)
    console.log('[FILEUPLOAD] Socket connected:', socket?.connected)
    console.log('[FILEUPLOAD] Socket ID:', socket?.id)
    
    if (socket && socket.connected) {
      const filePath = '/Users/ajaymerchia/wkspc/logui/demo.log'
      console.log('[FILEUPLOAD] Emitting tail:start for:', filePath)
      socket.emit('tail:start', filePath)
      
      // Add confirmation listener
      socket.once('source:added', (source) => {
        console.log('[FILEUPLOAD] Successfully started tailing:', source)
      })
      
      // Add error listener
      socket.once('error', (error) => {
        console.error('[FILEUPLOAD] Error starting tail:', error)
      })
    } else {
      console.error('[FILEUPLOAD] Socket not connected!', { 
        available: !!socket, 
        connected: socket?.connected,
        id: socket?.id
      })
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-text-secondary" />
          <h3 className="text-lg font-medium mb-2">Drop a log file here</h3>
          <p className="text-text-secondary mb-4">
            Or click to select a file to start tailing
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".log,.txt"
            className="hidden"
          />
          
          <div className="space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Select File
            </button>
            
            <button
              onClick={handleDemoFile}
              className="w-full px-4 py-2 bg-success/10 border border-success/20 text-success rounded-lg hover:bg-success/20 transition-colors flex items-center justify-center gap-2"
            >
              <File className="w-4 h-4" />
              Start Live Demo
            </button>
            
            <button
              onClick={handleSampleFile}
              className="w-full px-4 py-2 bg-black/5 dark:bg-white/5 border border-border text-text-primary rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <File className="w-4 h-4" />
              Use Sample Log
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileUpload