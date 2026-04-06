'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface CalEvent {
  id: string
  client_id: string
  scheduled_date: string
  activity_type: string
  status: string
  clients?: { first_name: string; last_name: string } | null
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DAY_NAMES_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const TYPE_COLORS: Record<string, { dot: string; pill: string }> = {
  call:  { dot: 'bg-blue-500',   pill: 'bg-blue-100 text-blue-800' },
  email: { dot: 'bg-purple-500', pill: 'bg-purple-100 text-purple-800' },
  text:  { dot: 'bg-green-500',  pill: 'bg-green-100 text-green-800' },
  visit: { dot: 'bg-amber-500',  pill: 'bg-amber-100 text-amber-800' },
}

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function firstDay(y: number, m: number)    { return new Date(y, m, 1).getDay() }

export default function CalendarPage() {
  const now = new Date()
  const [year, setYear]       = useState(now.getFullYear())
  const [month, setMonth]     = useState(now.getMonth())
  const [events, setEvents]   = useState<CalEvent[]>([])
  const [selected, setSelected] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView]       = useState<'month' | 'week'>('month')

  const loadEvents = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const start = new Date(year, month, 1).toISOString()
    const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
    const { data } = await supabase
      .from('follow_ups')
      .select('id, client_id, scheduled_date, activity_type, status, clients(first_name, last_name)')
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .order('scheduled_date')
    setEvents((data as unknown as CalEvent[]) ?? [])
    setLoading(false)
  }, [year, month])

  useEffect(() => { loadEvents() }, [loadEvents])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    setSelected(null)
  }
  function goToday() {
    setYear(now.getFullYear()); setMonth(now.getMonth()); setSelected(null)
  }

  // Group events by day string
  const eventMap: Record<string, CalEvent[]> = {}
  for (const ev of events) {
    const d = new Date(ev.scheduled_date).toDateString()
    if (!eventMap[d]) eventMap[d] = []
    eventMap[d].push(ev)
  }

  const totalDays = daysInMonth(year, month)
  const startDay  = firstDay(year, month)
  const todayStr  = now.toDateString()

  const selEvents = selected ? (eventMap[selected.toDateString()] ?? []) : []
  const selLabel  = selected
    ? selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null

  // Total events this month
  const monthTotal = events.length

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Calendar</h1>
          <p className="text-slate-400 text-sm mt-0.5">{monthTotal} events in {MONTH_NAMES[month]}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday}
            className="px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            Today
          </button>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => setView('month')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              Month
            </button>
            <button onClick={() => setView('week')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'week' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              List
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Calendar ─────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 font-bold transition-colors">‹</button>
            <h2 className="font-bold text-slate-900">{MONTH_NAMES[month]} {year}</h2>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 font-bold transition-colors">›</button>
          </div>

          {view === 'month' ? (
            <div className="p-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAY_NAMES_SHORT.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: totalDays }).map((_, i) => {
                  const day = i + 1
                  const date = new Date(year, month, day)
                  const dateStr = date.toDateString()
                  const dayEvents = eventMap[dateStr] ?? []
                  const isToday = dateStr === todayStr
                  const isSel   = selected?.toDateString() === dateStr

                  return (
                    <button
                      key={day}
                      onClick={() => setSelected(isSel ? null : date)}
                      className={`relative min-h-[56px] p-1.5 rounded-xl text-left transition-all ${
                        isSel   ? 'bg-blue-600 ring-2 ring-blue-500 ring-offset-1' :
                        isToday ? 'bg-blue-50 ring-1 ring-blue-200' :
                                  'hover:bg-slate-50'
                      }`}
                    >
                      <span className={`text-xs font-bold leading-none ${
                        isSel ? 'text-white' : isToday ? 'text-blue-600' : 'text-slate-700'
                      }`}>
                        {day}
                      </span>
                      {/* Event pills (up to 2 visible) */}
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 2).map(ev => {
                          const col = TYPE_COLORS[ev.activity_type?.toLowerCase()] ?? { dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600' }
                          const name = ev.clients ? ev.clients.first_name : 'Event'
                          return (
                            <div key={ev.id} className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-medium truncate ${isSel ? 'bg-blue-500 text-white' : col.pill}`}>
                              <span className={`w-1 h-1 rounded-full shrink-0 ${isSel ? 'bg-white' : col.dot}`} />
                              {name}
                            </div>
                          )
                        })}
                        {dayEvents.length > 2 && (
                          <p className={`text-[10px] font-medium px-1 ${isSel ? 'text-blue-200' : 'text-slate-400'}`}>
                            +{dayEvents.length - 2} more
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            /* List view */
            <div className="divide-y divide-slate-50 max-h-[520px] overflow-y-auto">
              {loading ? (
                <div className="space-y-3 p-4">
                  {[0,1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}
                </div>
              ) : events.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">No events this month</div>
              ) : (
                events.map(ev => {
                  const client = ev.clients
                  const name = client ? `${client.first_name} ${client.last_name}` : 'Unknown'
                  const dt = new Date(ev.scheduled_date)
                  const col = TYPE_COLORS[ev.activity_type?.toLowerCase()] ?? { dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600' }
                  return (
                    <Link key={ev.id} href={`/clients/${ev.client_id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className="text-center min-w-[36px]">
                        <p className="text-xs font-bold text-slate-500">{DAY_NAMES_SHORT[dt.getDay()]}</p>
                        <p className="text-lg font-bold text-slate-900 leading-tight">{dt.getDate()}</p>
                      </div>
                      <div className={`w-1 h-10 rounded-full ${col.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                        <p className="text-xs text-slate-500">
                          {ev.activity_type} · {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${col.pill}`}>
                        {ev.status}
                      </span>
                    </Link>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* ── Side panel ───────────────────────────── */}
        <div className="space-y-4">
          {/* Selected day detail */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">
                {selLabel ?? 'Select a day'}
              </h3>
            </div>
            <div className="p-4">
              {!selected ? (
                <p className="text-sm text-slate-400 text-center py-6">Click any day on the calendar</p>
              ) : selEvents.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-2xl mb-1">🗓</p>
                  <p className="text-sm text-slate-500 font-medium">Nothing scheduled</p>
                  <Link href="/clients"
                    className="text-xs text-blue-600 hover:underline mt-1 block">
                    Add a follow-up →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {selEvents.map(ev => {
                    const client = ev.clients
                    const name = client ? `${client.first_name} ${client.last_name}` : 'Unknown'
                    const col = TYPE_COLORS[ev.activity_type?.toLowerCase()] ?? { dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600' }
                    const time = new Date(ev.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    return (
                      <Link key={ev.id} href={`/clients/${ev.client_id}`}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700">{name}</p>
                          <p className="text-xs text-slate-500 capitalize">{ev.activity_type} · {time}</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Legend</p>
            <div className="space-y-2">
              {Object.entries(TYPE_COLORS).map(([type, col]) => (
                <div key={type} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                  <span className="text-sm text-slate-600 capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
