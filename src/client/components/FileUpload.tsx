import React, { useRef, useState, useEffect } from 'react'
import { File, ChevronDown, Copy, Terminal, Play, Upload } from 'lucide-react'
import { useSocketContext } from '../contexts/SocketContext'

interface SampleFile {
  name: string
  size: number
  modified: string
}

const FileUpload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectFileDropdownRef = useRef<HTMLDivElement>(null)
  const { socket } = useSocketContext()
  const [showSampleFiles, setShowSampleFiles] = useState(false)
  const [showSelectFileOptions, setShowSelectFileOptions] = useState(false)
  const [availableFiles, setAvailableFiles] = useState<SampleFile[]>([])
  const [isFileSystemApiSupported, setIsFileSystemApiSupported] = useState(false)
  const [showCopyToast, setShowCopyToast] = useState(false)
  
  useEffect(() => {
    // Check File System Access API support
    setIsFileSystemApiSupported('showOpenFilePicker' in window)
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSampleFiles(false)
      }
      if (selectFileDropdownRef.current && !selectFileDropdownRef.current.contains(event.target as Node)) {
        setShowSelectFileOptions(false)
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


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      startTailing(files[0])
    }
  }

  const startTailing = async (file: File) => {
    if (!socket) return

    // For already selected files, just use fallback upload since we can't get FileHandle
    fallbackToStaticUpload(file)
  }

  const startTailingWithPicker = async () => {
    if (!socket) return

    // Check if File System Access API is supported (Chrome/Edge)
    if (isFileSystemApiSupported && 'getFile' in FileSystemFileHandle.prototype) {
      try {
        // Use File System Access API for true tailing
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Log files',
              accept: {
                'text/plain': ['.log', '.txt'],
              },
            },
          ],
        })

        await startFileSystemTailing(fileHandle)
      } catch (error) {
        if ((error as any).name !== 'AbortError') {
          console.error('[FILEUPLOAD] File System Access API error:', error)
        }
      }
    } else {
      // Show error for unsupported browsers
      alert('Live tailing is only supported in Chrome and Edge browsers. Please use Static Upload instead or try the CLI tool.')
    }
  }

  const startFileSystemTailing = async (fileHandle: any) => {
    try {
      let lastSize = 0
      let lastReadTime = 0

      const tailFile = async () => {
        try {
          const currentFile = await fileHandle.getFile()
          const currentSize = currentFile.size
          const currentModTime = currentFile.lastModified

          // Only read if file has grown or been modified
          if (currentSize > lastSize || currentModTime > lastReadTime) {
            if (lastSize === 0) {
              // First read - send entire file
              const reader = new FileReader()
              reader.onload = (e) => {
                const content = e.target?.result as string
                if (content) {
                  const lines = content.split('\n').filter(line => line.trim())
                  socket?.emit('file:upload', {
                    name: currentFile.name,
                    size: currentFile.size,
                    lines: lines,
                    tailing: true
                  })
                }
              }
              reader.readAsText(currentFile)
            } else {
              // Read only new content
              const slice = currentFile.slice(lastSize)
              const reader = new FileReader()
              reader.onload = (e) => {
                const newContent = e.target?.result as string
                if (newContent && newContent.trim()) {
                  const lines = newContent.split('\n').filter(line => line.trim())
                  socket?.emit('file:append', {
                    name: currentFile.name,
                    lines: lines
                  })
                }
              }
              reader.readAsText(slice)
            }

            lastSize = currentSize
            lastReadTime = currentModTime
          }
        } catch (error) {
          console.error('[FILEUPLOAD] Error reading file during tail:', error)
        }
      }

      // Initial read
      await tailFile()

      // Start tailing interval
      const interval = setInterval(tailFile, 1000)

      // Cleanup on socket disconnect
      socket?.once('disconnect', () => {
        clearInterval(interval)
      })

    } catch (error) {
      console.error('[FILEUPLOAD] Error starting file system tailing:', error)
    }
  }

  const fallbackToStaticUpload = (file: File) => {
    try {
      // Show warning for large files
      if (file.size > 5 * 1024 * 1024) { // 5MB warning threshold
        console.log(`[FILEUPLOAD] Processing large file: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
      }
      
      const reader = new FileReader()
      
      reader.onerror = () => {
        console.error('[FILEUPLOAD] Error reading file')
        alert('Failed to read the file. It may be too large or corrupted.')
      }
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          if (content) {
            console.log(`[FILEUPLOAD] File read successfully, processing ${content.length} characters`)
            const lines = content.split('\n').filter(line => line.trim())
            console.log(`[FILEUPLOAD] Extracted ${lines.length} non-empty lines, sending to server`)
            
            socket?.emit('file:upload', {
              name: file.name,
              size: file.size,
              lines: lines,
              tailing: false
            })
          }
        } catch (error) {
          console.error('[FILEUPLOAD] Error processing file content:', error)
          alert('Failed to process the file content. The file may be too large.')
        }
      }
      
      reader.readAsText(file)
    } catch (error) {
      console.error('[FILEUPLOAD] Error reading file:', error)
      alert('Failed to upload the file. Please try a smaller file or use the CLI.')
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

  const copyCliCommand = () => {
    const command = "logui --tail /path/to/your/file.log"
    navigator.clipboard.writeText(command).then(() => {
      console.log('[FILEUPLOAD] CLI command copied to clipboard')
      setShowCopyToast(true)
      setTimeout(() => setShowCopyToast(false), 2000)
    }).catch(err => {
      console.error('[FILEUPLOAD] Failed to copy CLI command:', err)
    })
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-md w-full relative">
        <div className="text-center p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">LogUI</h1>
            <p className="text-text-secondary">Visualize and filter your console logs with ease</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".log,.txt"
            className="hidden"
          />
          
          <div className="space-y-3">
            <div className="relative" ref={selectFileDropdownRef}>
              <button
                onClick={() => setShowSelectFileOptions(!showSelectFileOptions)}
                className="w-full px-4 py-2 bg-black/5 dark:bg-white/5 border border-border text-text-primary rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <File className="w-4 h-4" />
                  Select a File
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showSelectFileOptions ? 'rotate-180' : ''}`} />
              </button>
              
              {showSelectFileOptions && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-900 dark:bg-gray-900 border border-border rounded-lg shadow-xl z-[999]">
                  <button
                    onClick={() => {
                      startTailingWithPicker()
                      setShowSelectFileOptions(false)
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b border-border first:rounded-t-lg"
                  >
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Play className="w-4 h-4" />
                      Live Tail
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      Chrome only, livestream changes to a log file
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      fileInputRef.current?.click()
                      setShowSelectFileOptions(false)
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors last:rounded-b-lg"
                  >
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Upload className="w-4 h-4" />
                      Static Upload
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      Upload a complete log file for analysis
                    </div>
                  </button>
                </div>
              )}
            </div>
            
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

            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Terminal className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                    Or tail your logs with the CLI:
                  </p>
                  <div className="flex items-center gap-2 p-2 bg-gray-900 rounded text-xs font-mono text-green-400">
                    <code className="flex-1">logui --tail /path/to/your/file.log</code>
                    <button
                      onClick={copyCliCommand}
                      className="p-1 hover:bg-gray-800 rounded transition-colors"
                      title="Copy command"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  {!isFileSystemApiSupported && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Your browser doesn't support live file monitoring. Use the CLI for true tailing.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copy toast */}
        {showCopyToast && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
            <Copy className="w-4 h-4" />
            <span className="text-sm font-medium">Copied to clipboard!</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileUpload