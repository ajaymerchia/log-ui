import React, { useEffect } from 'react'
import { useLogStore } from './store/useLogStore'
import { SocketProvider } from './contexts/SocketContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import LogViewer from './components/LogViewer'
import StatusBar from './components/StatusBar'
import Toast from './components/Toast'

function AppContent() {
  const { isConnected, isDarkMode } = useLogStore()

  // Initialize theme on app start
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-surface-dark" style={{ backgroundColor: 'var(--surface)' }}>
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <LogViewer />
        </main>
      </div>
      <StatusBar />
      <Toast />
    </div>
  )
}

function App() {
  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  )
}

export default App