'use client'

import type { ReactNode } from 'react'

interface PrintPreviewProps {
  children: ReactNode
  onBack: () => void
}

export default function PrintPreview({ children, onBack }: PrintPreviewProps) {
  function handlePrint() {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Printable content */}
      <div className="print:bg-white">{children}</div>

      {/* Floating action bar — hidden when printing */}
      <div className="fixed bottom-0 left-0 right-0 z-50 print:hidden">
        <div className="mx-auto max-w-3xl px-4 pb-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <button
              onClick={onBack}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Back to Agreement
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save as PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
