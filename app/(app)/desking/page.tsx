import { Suspense } from 'react'
import DeskingClient from './DeskingClient'

export default function DeskingPage() {
  return (
    <Suspense fallback={
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Desking Matrix</h1>
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    }>
      <DeskingClient />
    </Suspense>
  )
}
