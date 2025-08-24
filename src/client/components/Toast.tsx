import React, { useEffect } from 'react'
import { useLogStore } from '../store/useLogStore'
import { X, CheckCircle, XCircle, Info } from 'lucide-react'

const Toast: React.FC = () => {
  const { toasts, removeToast } = useLogStore()

  const getToastStyles = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success':
        return 'bg-success/20 border-success/40 text-success'
      case 'error':
        return 'bg-error/20 border-error/40 text-error'
      case 'info':
      default:
        return 'bg-primary/20 border-primary/40 text-primary'
    }
  }

  const getIcon = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />
      case 'error':
        return <XCircle className="w-4 h-4" />
      case 'info':
      default:
        return <Info className="w-4 h-4" />
    }
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg transform transition-all duration-300 ease-in-out animate-in slide-in-from-right-5 ${getToastStyles(toast.type)}`}
        >
          {getIcon(toast.type)}
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
            title="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  )
}

export default Toast