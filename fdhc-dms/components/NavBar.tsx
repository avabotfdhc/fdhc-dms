'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '\uD83D\uDCCA' },
  { href: '/follow-ups', label: 'Follow-ups', icon: '\uD83D\uDD14' },
  { href: '/clients', label: 'Clients', icon: '\uD83D\uDC65' },
  { href: '/clients/pipeline', label: 'Pipeline', icon: '\uD83D\uDCCA' },
  { href: '/inventory', label: 'Inventory', icon: '\uD83C\uDFE0' },
  { href: '/agreements', label: 'Deals', icon: '\uD83D\uDCCB' },
  { href: '/desking', label: 'Desking', icon: '\uD83E\uDDEE' },
  { href: '/accounting', label: 'Accounting', icon: '\uD83D\uDCB0' },
  { href: '/partners', label: 'Partners', icon: '\uD83E\uDD1D' },
  { href: '/service', label: 'Service', icon: '\uD83D\uDD27' },
  { href: '/settings', label: 'Settings', icon: '\u2699\uFE0F' },
]

// Mobile bottom nav: first 4 items + More
const mobileMainItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '\uD83D\uDCCA' },
  { href: '/follow-ups', label: 'Follow-ups', icon: '\uD83D\uDD14' },
  { href: '/clients', label: 'Clients', icon: '\uD83D\uDC65' },
  { href: '/agreements', label: 'Deals', icon: '\uD83D\uDCCB' },
]

const mobileMoreItems = [
  { href: '/clients/pipeline', label: 'Pipeline', icon: '\uD83D\uDCCA' },
  { href: '/inventory', label: 'Inventory', icon: '\uD83C\uDFE0' },
  { href: '/desking', label: 'Desking', icon: '\uD83E\uDDEE' },
  { href: '/accounting', label: 'Accounting', icon: '\uD83D\uDCB0' },
  { href: '/partners', label: 'Partners', icon: '\uD83E\uDD1D' },
  { href: '/service', label: 'Service', icon: '\uD83D\uDD27' },
  { href: '/settings', label: 'Settings', icon: '\u2699\uFE0F' },
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
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-slate-900 text-white min-h-screen fixed left-0 top-0 z-30">
        <div className="px-4 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-sm">{'\uD83C\uDFE0'}</div>
            <div>
              <p className="font-bold text-sm leading-tight">FDHC DMS</p>
              <p className="text-slate-400 text-xs">Factory Direct Homes</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-2 py-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white w-full transition-colors"
          >
            <span>{'\uD83D\uDEAA'}</span>
            {loggingOut ? 'Signing out\u2026' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex">
        {mobileMainItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
              isActive(item.href)
                ? 'text-blue-600'
                : 'text-slate-500'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="mt-0.5 leading-tight">{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setShowMore(true)}
          className="flex-1 flex flex-col items-center py-2 text-xs font-medium text-slate-500"
        >
          <span className="text-lg">{'\u2022\u2022\u2022'}</span>
          <span className="mt-0.5 leading-tight">More</span>
        </button>
      </nav>

      {/* Mobile "More" sheet */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMore(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 pb-8 animate-slide-up">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" />
            <div className="space-y-1">
              {mobileMoreItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  setShowMore(false)
                  handleLogout()
                }}
                disabled={loggingOut}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
              >
                <span className="text-lg">{'\uD83D\uDEAA'}</span>
                {loggingOut ? 'Signing out\u2026' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
