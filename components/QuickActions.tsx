'use client'

import { useState } from 'react'
import AddActivityForm from '@/components/AddActivityForm'

interface QuickActionsProps {
  clientId: string
  phone?: string
  email?: string
  onActivityAdded?: () => void
}

export default function QuickActions({
  clientId,
  phone,
  email,
  onActivityAdded,
}: QuickActionsProps) {
  const [showNoteForm, setShowNoteForm] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {phone && (
          <a
            href={`tel:${phone}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors border border-green-200"
          >
            <span className="text-base">&#9742;</span>
            Call
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
          >
            <span className="text-base">&#9993;</span>
            Email
          </a>
        )}
        {phone && (
          <a
            href={`sms:${phone}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors border border-purple-200"
          >
            <span className="text-base">&#128172;</span>
            Text
          </a>
        )}
        <button
          type="button"
          onClick={() => setShowNoteForm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors border border-amber-200"
        >
          <span className="text-base">&#9998;</span>
          Add Note
        </button>
      </div>

      {showNoteForm && (
        <AddActivityForm
          clientId={clientId}
          onClose={() => setShowNoteForm(false)}
          onSaved={() => {
            setShowNoteForm(false)
            onActivityAdded?.()
          }}
        />
      )}
    </>
  )
}
