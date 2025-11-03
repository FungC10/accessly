'use client'

import { useEffect, useState } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToasterProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function Toaster({ toasts, onRemove }: ToasterProps) {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    toasts.forEach((toast) => {
      const timer = setTimeout(() => {
        onRemove(toast.id)
      }, 5000)

      return () => clearTimeout(timer)
    })
  }, [toasts, onRemove])

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-20 right-6 z-50 flex flex-col gap-3"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const bgColor =
          toast.type === 'error'
            ? 'bg-red-500/20 border-red-500/30 text-red-300'
            : toast.type === 'success'
              ? 'bg-green-500/20 border-green-500/30 text-green-300'
              : 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'

        return (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg border backdrop-blur-sm ${bgColor} shadow-lg min-w-[300px] max-w-md ${
              prefersReducedMotion ? '' : 'animate-in slide-in-from-right'
            }`}
            role="alert"
          >
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        )
      })}
    </div>
  )
}

// Toast context/hook for easy access
const toastListeners: Array<(toast: Toast) => void> = []
let toastId = 0

export function showToast(message: string, type: Toast['type'] = 'info') {
  const toast: Toast = {
    id: `toast-${++toastId}`,
    message,
    type,
  }

  toastListeners.forEach((listener) => listener(toast))
  return toast.id
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast])
    }

    toastListeners.push(listener)

    return () => {
      const index = toastListeners.indexOf(listener)
      if (index > -1) {
        toastListeners.splice(index, 1)
      }
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return { toasts, removeToast }
}
