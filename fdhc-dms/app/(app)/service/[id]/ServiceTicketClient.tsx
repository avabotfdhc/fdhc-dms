'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  ticketId: string
  initialStatus: string
  initialData: Record<string, unknown>
}

const statusFlow: Record<string, string> = {
  open: 'in_progress',
  in_progress: 'closed',
}

const statusLabels: Record<string, string> = {
  open: 'Mark In Progress',
  in_progress: 'Close Ticket',
}

export default function ServiceTicketClient({ ticketId, initialStatus, initialData }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [updating, setUpdating] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const notes = Array.isArray(initialData.notes) ? initialData.notes as Record<string, string>[] : []
  const [localNotes, setLocalNotes] = useState(notes)

  async function advanceStatus() {
    const nextStatus = statusFlow[status]
    if (!nextStatus) return
    setUpdating(true)
    try {
      await supabase.from('service_tickets').update({ status: nextStatus }).eq('id', ticketId)
      setStatus(nextStatus)
      router.refresh()
    } finally {
      setUpdating(false)
    }
  }

  async function reopenTicket() {
    setUpdating(true)
    try {
      await supabase.from('service_tickets').update({ status: 'open' }).eq('id', ticketId)
      setStatus('open')
      router.refresh()
    } finally {
      setUpdating(false)
    }
  }

  async function addNote() {
    if (!noteText.trim()) return
    setAddingNote(true)
    const newNote = { text: noteText, date: new Date().toISOString() }
    const updatedNotes = [...localNotes, newNote]

    try {
      await supabase
        .from('service_tickets')
        .update({
          data: { ...initialData, notes: updatedNotes },
        })
        .eq('id', ticketId)
      setLocalNotes(updatedNotes)
      setNoteText('')
    } finally {
      setAddingNote(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Status actions */}
      <div className="flex flex-wrap gap-2">
        {statusFlow[status] && (
          <button
            onClick={advanceStatus}
            disabled={updating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {updating ? 'Updating...' : statusLabels[status]}
          </button>
        )}
        {status === 'closed' && (
          <button
            onClick={reopenTicket}
            disabled={updating}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {updating ? 'Updating...' : 'Reopen Ticket'}
          </button>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Notes & Updates</h2>

        {localNotes.length > 0 ? (
          <div className="space-y-3 mb-4">
            {localNotes.map((note, i) => (
              <div key={i} className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.text}</p>
                {note.date && (
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(note.date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 mb-4">No notes yet</p>
        )}

        <div className="flex gap-2">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note..."
            rows={2}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
          />
          <button
            onClick={addNote}
            disabled={addingNote || !noteText.trim()}
            className="self-end rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {addingNote ? '...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
