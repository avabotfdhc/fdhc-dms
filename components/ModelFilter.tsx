'use client'

import { useRouter } from 'next/navigation'

interface ModelFilterProps {
  models: Array<{ id: string; manufacturer: string; model_name: string }>
  currentFilter: string
}

export default function ModelFilter({ models, currentFilter }: ModelFilterProps) {
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    if (value) {
      router.push(`/inventory?model=${value}`)
    } else {
      router.push('/inventory')
    }
  }

  return (
    <select
      value={currentFilter}
      onChange={handleChange}
      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      <option value="">All Models</option>
      {models.map(m => (
        <option key={m.id} value={m.id}>
          {m.manufacturer} - {m.model_name}
        </option>
      ))}
    </select>
  )
}
