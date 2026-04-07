'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ORDER_STAGES = [
  { id: 'ordered',      label: 'Ordered',       icon: '📝', color: 'bg-slate-100 text-slate-700' },
  { id: 'in_production',label: 'In Production', icon: '🏗️', color: 'bg-blue-100 text-blue-700' },
  { id: 'quality_check',label: 'Quality Check', icon: '✅', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'ready_to_ship',label: 'Ready to Ship', icon: '📦', color: 'bg-amber-100 text-amber-700' },
  { id: 'in_transit',   label: 'In Transit',    icon: '🚛', color: 'bg-orange-100 text-orange-700' },
  { id: 'on_lot',       label: 'On Lot',        icon: '🏠', color: 'bg-purple-100 text-purple-700' },
  { id: 'set',          label: 'Set & Ready',   icon: '🎉', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'delivered',    label: 'Delivered',     icon: '✨', color: 'bg-green-100 text-green-700' },
]

interface Order {
  id: string
  order_number: string
  manufacturer_name: string
  model_name: string
  hin: string | null
  serial_number: string | null
  status: string
  ordered_date: string
  estimated_delivery: string | null
  actual_delivery: string | null
  client_id: string | null
  notes: string | null
  created_at: string
  clients?: { first_name: string; last_name: string } | null
  profiles?: { name: string | null; username: string | null } | null
}

interface Props {
  orders: Order[]
  manufacturers: Array<{ id: string; company_name: string }>
}

export default function OrdersClient({ orders: initialOrders, manufacturers }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState({
    manufacturer_name: '',
    model_name: '',
    hin: '',
    serial_number: '',
    status: 'ordered',
    ordered_date: new Date().toISOString().split('T')[0],
    estimated_delivery: '',
    notes: '',
  })

  const filtered = orders.filter(o =>
    !filter ||
    o.order_number?.toLowerCase().includes(filter.toLowerCase()) ||
    o.manufacturer_name?.toLowerCase().includes(filter.toLowerCase()) ||
    o.model_name?.toLowerCase().includes(filter.toLowerCase()) ||
    o.clients?.first_name?.toLowerCase().includes(filter.toLowerCase()) ||
    o.clients?.last_name?.toLowerCase().includes(filter.toLowerCase())
  )

  async function handleCreate() {
    if (!form.manufacturer_name || !form.model_name) return
    setSaving(true)
    const supabase = createClient()
    const order_number = 'ORD-' + Date.now().toString().slice(-6)
    const { data, error } = await supabase
      .from('manufacturer_orders')
      .insert({ ...form, order_number })
      .select('*, clients(first_name, last_name), profiles(name, username)')
      .single()
    if (!error && data) {
      setOrders(prev => [data as Order, ...prev])
      setShowNew(false)
      setForm({ manufacturer_name: '', model_name: '', hin: '', serial_number: '', status: 'ordered', ordered_date: new Date().toISOString().split('T')[0], estimated_delivery: '', notes: '' })
    }
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    const supabase = createClient()
    await supabase.from('manufacturer_orders').update({ status }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  const stageCounts = ORDER_STAGES.map(s => ({
    ...s,
    count: orders.filter(o => o.status === s.id).length,
  }))

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manufacturer Orders</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track homes from order through delivery</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
          + New Order
        </button>
      </div>

      {/* Stage pipeline overview */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
        {stageCounts.map(s => (
          <div key={s.id} className={`${s.color} rounded-xl p-3 text-center`}>
            <p className="text-xl">{s.icon}</p>
            <p className="text-lg font-bold mt-1">{s.count}</p>
            <p className="text-[10px] font-semibold leading-tight mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Search by order #, manufacturer, model, or client…"
        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Orders list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-slate-500 font-medium">No orders yet</p>
            <button onClick={() => setShowNew(true)} className="mt-3 text-sm text-blue-600 hover:underline">
              Create your first order →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(order => {
              const stage = ORDER_STAGES.find(s => s.id === order.status) || ORDER_STAGES[0]
              const daysLeft = order.estimated_delivery
                ? Math.ceil((new Date(order.estimated_delivery).getTime() - Date.now()) / 86400000)
                : null

              return (
                <div key={order.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
                    {stage.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 text-sm">{order.order_number}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stage.color}`}>{stage.label}</span>
                      {daysLeft !== null && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${daysLeft < 7 ? 'bg-red-100 text-red-700' : daysLeft < 30 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {daysLeft > 0 ? `${daysLeft}d to delivery` : daysLeft === 0 ? 'Due today' : `${Math.abs(daysLeft)}d overdue`}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 mt-0.5">{order.manufacturer_name} · {order.model_name}</p>
                    {order.hin && <p className="text-xs text-slate-400 mt-0.5">HIN: {order.hin}</p>}
                    {order.clients && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Client: {order.clients.first_name} {order.clients.last_name}
                      </p>
                    )}
                  </div>
                  {/* Quick stage update */}
                  <select
                    value={order.status}
                    onChange={e => updateStatus(order.id, e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0"
                  >
                    {ORDER_STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New Order Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNew(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-900 mb-4">New Manufacturer Order</h2>
            <div className="space-y-3">
              {manufacturers.length > 0 ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Manufacturer</label>
                  <select
                    value={form.manufacturer_name}
                    onChange={e => setForm(f => ({ ...f, manufacturer_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select manufacturer…</option>
                    {manufacturers.map(m => <option key={m.id} value={m.company_name}>{m.company_name}</option>)}
                    <option value="other">Other</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Manufacturer *</label>
                  <input value={form.manufacturer_name} onChange={e => setForm(f => ({ ...f, manufacturer_name: e.target.value }))}
                    placeholder="e.g. Clayton, Skyline, Champion" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Model Name *</label>
                <input value={form.model_name} onChange={e => setForm(f => ({ ...f, model_name: e.target.value }))}
                  placeholder="e.g. Karson 3/2 DW" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">HIN / Serial</label>
                  <input value={form.hin} onChange={e => setForm(f => ({ ...f, hin: e.target.value }))}
                    placeholder="Home ID Number" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Order Date</label>
                  <input type="date" value={form.ordered_date} onChange={e => setForm(f => ({ ...f, ordered_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Delivery</label>
                <input type="date" value={form.estimated_delivery} onChange={e => setForm(f => ({ ...f, estimated_delivery: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Buyer, lot location, special options…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowNew(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving || !form.manufacturer_name || !form.model_name}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Create Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
