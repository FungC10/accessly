'use client'

import { useState } from 'react'
import { IssuesList } from './IssuesList'

interface IssuesPageClientProps {
  isAdmin: boolean
  userId: string
}

export function IssuesPageClient({ isAdmin, userId }: IssuesPageClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Issues</h1>
            <p className="text-slate-400 mt-1">
              {isAdmin ? 'Manage and respond to all issues' : 'Issues assigned to you'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium"
            >
              + Create New Issue
            </button>
          )}
        </div>

        <IssuesList 
          isAdmin={isAdmin} 
          userId={userId} 
          createButtonLocation="header"
          externalShowCreateModal={showCreateModal}
          onExternalShowCreateModalChange={setShowCreateModal}
        />
      </div>
    </div>
  )
}

