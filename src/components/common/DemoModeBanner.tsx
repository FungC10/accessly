'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'

export function DemoModeBanner() {
  const { data: session } = useSession()
  const [isDismissed, setIsDismissed] = useState(false)

  // Only show for DEMO_OBSERVER role
  if (session?.user?.role !== 'DEMO_OBSERVER' || isDismissed) {
    return null
  }

  return (
    <div className="bg-slate-700 border-b border-slate-600 px-4 py-2 text-sm text-slate-200 flex items-center justify-between">
      <span>DEMO MODE – Read-only</span>
      <button
        onClick={() => setIsDismissed(true)}
        className="text-slate-400 hover:text-slate-200 transition-colors"
        aria-label="Dismiss banner"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

