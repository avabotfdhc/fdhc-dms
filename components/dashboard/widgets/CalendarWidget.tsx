'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface CalEvent {
  id: string
  client_id: string
  scheduled_date: string
  activity_type: string
  clients?: { first_name: string; last_name: string } | null
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa']

export default function CalendarWidget() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const start = new Date(year, month, 1).toISOString()
      const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
      const { data } = await supabase
        .from('follow_ups')
        .select('id, client_id, scheduled_date, activity_type, clients(first_name, last_name)')
        .gte('scheduled_date', start)
        .lte('scheduled_date', end)
        .order('scheduled_date')
      setEvents((data as unknown as CalEvent[]) ?? [])
    }
    load()
  }, [year, month])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    setSelected(null)
  }

  const totalDays = daysInMonth(year, month)
  const startDay  = firstDayOfMonth(year, month)
  const today     = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : -1

  // Map day → events
  const eventMap: Record<number, CalEvent[]> = {}
  for (const ev of events) {
    const d = new Date(ev.scheduled_date).getDate()
    if (!eventMap[d]) eventMap[d] = []
    eventMap[d].push(ev)
  }

  const selectedEvents = selected ? (eventMap[selected] ?? []) : []

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">‹</button>
        <span className="font-semibold text-sm text-slate-800">{MONTH_NAMES[month]} {year}</span>
        <button onClick={nextMonth} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">›</button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1
          const hasEvents = !!eventMap[day]
          const isToday = day === today
          const isSel   = day === selected
          return (
            <button
              key={day}
              onClick={() => setSelected(isSel ? null : day)}
              className={`relative flex flex-col items-center justify-center h-9 w-full rounded-lg text-xs font-medium transition-all ${
                isSel   ? 'bg-blue-600 text-white shadow-md' :
                isToday ? 'bg-blue-50 text-blue-700 font-bold ring-1 ring-blue-300' :
                          'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {day}
              {hasEvents && (
                <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSel ? 'bg-blue-200' : 'bg-blue-500'}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day events */}
      {selected && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 mb-2">
            {MONTH_NAMES[month]} {selected}
            {selectedEvents.length > 0 ? ` — ${selectedEvents.length} event${selectedEvents.length > 1 ? 's' : ''}` : ' — nothing scheduled'}
          </p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {selectedEvents.map(ev => {
              const client = ev.clients
              const name = client ? `${client.first_name} ${client.last_name}` : 'Client'
              const time = new Date(ev.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              return (
                <Link
                  key={ev.id}
                  href={`/clients/${ev.client_id}`}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{name}</p>
                    <p className="text-xs text-slate-500 capitalize">{ev.activity_type} · {time}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Full calendar link */}
      <Link href="/calendar" className="mt-3 flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
        Open full calendar →
      </Link>
    </div>
  )
}
