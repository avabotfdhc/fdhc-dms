'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

// Nav sections for visual grouping on desktop
const navSections = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard',  label: 'Dashboard',  emoji: '📊' },
      { href: '/calendar',   label: 'Calendar',   emoji: '📅' },
      { href: '/follow-ups', label: 'Follow-ups', emoji: '🔔' },
      { href: '/clients',    label: 'Clients',    emoji: '👥' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/clients/pipeline', label: 'Pipeline',   emoji: '📈' },
      { href: '/inventory',        label: 'Inventory',  emoji: '🏠' },
      { href: '/agreements',       label: 'Deals',      emoji: '📋' },
      { href: '/desking',          label: 'Desking',    emoji: '🧮' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/orders',      label: 'Orders',     emoji: '🏭' },
      { href: '/accounting',  label: 'Accounting', emoji: '💰' },
      { href: '/partners',    label: 'Partners',   emoji: '🤝' },
      { href: '/service',     label: 'Service',    emoji: '🔧' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/reports',        label: 'Reports',      emoji: '📉' },
      { href: '/communications', label: 'Comms Hub',    emoji: '💬' },
      { href: '/settings',       label: 'Settings',     emoji: '⚙️' },
    ],
  },
]

const mobileMainItems = [
  { href: '/dashboard',  label: 'Home',       emoji: '📊' },
  { href: '/follow-ups', label: 'Follow-ups', emoji: '🔔' },
  { href: '/clients',    label: 'Clients',    emoji: '👥' },
  { href: '/calendar',   label: 'Calendar',   emoji: '📅' },
]

const mobileMoreItems = [
  { href: '/clients/pipeline', label: 'Pipeline',   emoji: '📈' },
  { href: '/inventory',        label: 'Inventory',  emoji: '🏠' },
  { href: '/agreements',       label: 'Deals',      emoji: '📋' },
  { href: '/desking',          label: 'Desking',    emoji: '🧮' },
  { href: '/orders',           label: 'Orders',     emoji: '🏭' },
  { href: '/reports',          label: 'Reports',    emoji: '📉' },
  { href: '/communications',   label: 'Comms Hub',  emoji: '💬' },
  { href: '/accounting',       label: 'Accounting', emoji: '💰' },
  { href: '/partners',         label: 'Partners',   emoji: '🤝' },
  { href: '/service',          label: 'Service',    emoji: '🔧' },
  { href: '/settings',         label: 'Settings',   emoji: '⚙️' },
]

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [loggingOut, setLoggingOut] = useState(false)
  const [showMore, setShowMore] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/clients/pipeline') return pathname === '/clients/pipeline'
    if (href === '/clients') return pathname.startsWith('/clients') && pathname !== '/clients/pipeline'
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen fixed left-0 top-0 z-30 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center text-base shadow-lg shadow-blue-500/30 group-hover:bg-blue-400 transition-colors">
              🏠
            </div>
            <div>
              <p className="font-bold text-sm leading-tight tracking-tight">FDHC DMS</p>
              <p className="text-slate-400 text-xs leading-tight">Factory Direct Homes</p>
            </div>
          </Link>
        </div>

        {/* Sections */}
        <nav className="flex-1 px-2 py-4 space-y-5 overflow-y-auto scrollbar-none">
          {navSections.map(section => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? 'bg-blue-600/90 text-white shadow-md shadow-blue-500/20'
                          : 'text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-base w-5 text-center">{item.emoji}</span>
                      <span>{item.label}</span>
                      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-2 py-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/10 hover:text-white w-full transition-all"
          >
            <span className="text-base w-5 text-center">🚪</span>
            {loggingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* ── Mobile top header ─────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between px-4 h-14">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center text-xs">🏠</div>
          <span className="font-bold text-sm text-slate-900">FDHC DMS</span>
        </Link>
        <Link href="/follow-ups" className="relative">
          <span className="text-xl">🔔</span>
        </Link>
      </header>

      {/* ── Mobile bottom nav ─────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 flex">
        {mobileMainItems.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center pt-2 pb-3 text-xs font-medium transition-colors ${
                active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={`text-xl leading-none ${active ? 'scale-110' : ''} transition-transform`}>
                {item.emoji}
              </span>
              <span className="mt-1 leading-tight">{item.label}</span>
              {active && <span className="mt-0.5 w-1 h-1 rounded-full bg-blue-500" />}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setShowMore(true)}
          className="flex-1 flex flex-col items-center pt-2 pb-3 text-xs font-medium text-slate-400"
        >
          <span className="text-xl leading-none">⋯</span>
          <span className="mt-1 leading-tight">More</span>
        </button>
      </nav>

      {/* ── Mobile "More" sheet ───────────────────────── */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMore(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl animate-slide-up">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="px-4 pb-10 pt-2">
              <div className="grid grid-cols-2 gap-2">
                {mobileMoreItems.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">{item.emoji}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
              <button
                onClick={() => { setShowMore(false); handleLogout() }}
                disabled={loggingOut}
                className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
              >
                <span className="text-lg">🚪</span>
                {loggingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
