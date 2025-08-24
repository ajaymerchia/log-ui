import React, { useRef, useState, useEffect } from 'react'
import { Upload, File, ChevronDown } from 'lucide-react'
import { useSocketContext } from '../contexts/SocketContext'

interface SampleFile {
  name: string
  size: number
  modified: string
}

const FileUpload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { socket } = useSocketContext()
  const [showSampleFiles, setShowSampleFiles] = useState(false)
  const [availableFiles, setAvailableFiles] = useState<SampleFile[]>([])
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSampleFiles(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  useEffect(() => {
    // Fetch available sample files from the API
    const fetchSampleFiles = async () => {
      try {
        const response = await fetch('/api/samples')
        if (response.ok) {
          const files = await response.json()
          setAvailableFiles(files)
        } else {
          console.error('[FILEUPLOAD] Failed to fetch sample files:', response.statusText)
        }
      } catch (error) {
        console.error('[FILEUPLOAD] Error fetching sample files:', error)
      }
    }
    
    fetchSampleFiles()
  }, [])

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

  const loadSampleFile = async (fileName: string) => {
    if (!socket || !socket.connected) {
      console.error('[FILEUPLOAD] Socket not connected!', { 
        available: !!socket, 
        connected: socket?.connected,
        id: socket?.id
      })
      return
    }

    console.log('[FILEUPLOAD] Loading sample file:', fileName)
    
    // All sample files use tailing for real-time updates
    const filePath = `/Users/ajaymerchia/wkspc/logui/samples/${fileName}`
    socket.emit('tail:start', filePath)
    
    socket.once('source:added', (source) => {
      console.log('[FILEUPLOAD] Successfully started tailing:', source)
    })
    
    socket.once('error', (error) => {
      console.error('[FILEUPLOAD] Error starting tail:', error)
    })
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
            
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowSampleFiles(!showSampleFiles)}
                className="w-full px-4 py-2 bg-black/5 dark:bg-white/5 border border-border text-text-primary rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <File className="w-4 h-4" />
                  Load Sample Files
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showSampleFiles ? 'rotate-180' : ''}`} />
              </button>
              
              {showSampleFiles && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-900 dark:bg-gray-900 border border-border rounded-lg shadow-xl z-[999] max-h-80 overflow-y-auto">
                  {availableFiles.map((file, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        loadSampleFile(file.name)
                        setShowSampleFiles(false)
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b border-border last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
                    >
                      <div className="font-medium text-sm">{file.name}</div>
                      <div className="text-xs text-text-secondary mt-1">
                        {(file.size / 1024).toFixed(1)} KB • Modified {new Date(file.modified).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileUpload