import React, { useEffect } from 'react'
import { useLogStore } from '../store/useLogStore'
import { Moon, Sun, Command, Menu } from 'lucide-react'
import { Tooltip } from '@mui/material'

const Header: React.FC = () => {
  const { 
    isConnected, 
    toggleMobileSidebar,
    // isDarkMode,
    // toggleDarkMode
  } = useLogStore()

  // // Keyboard shortcut: Command + Shift + 8
  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if (e.metaKey && e.shiftKey && e.key === '8') {
  //       e.preventDefault()
  //       toggleDarkMode()
  //     }
  //   }

  //   document.addEventListener('keydown', handleKeyDown)
  //   return () => document.removeEventListener('keydown', handleKeyDown)
  // }, [toggleDarkMode])

  return (
    <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-white/95 dark:bg-surface-dark/95 backdrop-blur">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button 
          className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-md sm:hidden"
          onClick={toggleMobileSidebar}
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          title="Refresh app and reset connections"
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">LV</span>
          </div>
          <h1 className="text-lg font-semibold">LogViewer</h1>
        </button>
        
        <div className="hidden sm:flex items-center gap-2 ml-4">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse-dot' : 'bg-error'}`} />
          <span className="text-sm text-text-secondary">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* <Tooltip title="⌘⇧8" placement="top" arrow>
          <button 
            onClick={toggleDarkMode}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors rounded-md hover:bg-black/5 dark:hover:bg-white/5"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden lg:inline">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </Tooltip> */}
        
        {/* Mobile connection status */}
        <div className={`w-2 h-2 rounded-full sm:hidden ${isConnected ? 'bg-success animate-pulse-dot' : 'bg-error'}`} />
      </div>
    </header>
  )
}

export default Header