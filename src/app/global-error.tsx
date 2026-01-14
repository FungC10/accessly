'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console (safe, no external dependencies)
    console.error('Global Error Boundary caught:', error)
  }, [error])

  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-950 text-white antialiased">
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-red-400 mb-4">
              Something went wrong!
            </h2>
            <p className="text-gray-400 mb-6">
              A critical error occurred. Please refresh the page or try again.
            </p>
            <div className="space-y-3">
              <button
                onClick={reset}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg transition-colors"
              >
                Go home
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                  Error Details (dev only)
                </summary>
                <pre className="text-xs text-red-300 bg-gray-900 p-4 rounded overflow-auto">
                  {error.message}
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
