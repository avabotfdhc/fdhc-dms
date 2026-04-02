'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/clients', label: 'Clients', icon: '👥' },
  { href: '/inventory', label: 'Inventory', icon: '🏠' },
  { href: '/agreements', label: 'Deals', icon: '📋' },
  { href: '/desking', label: 'Desking', icon: '🧮' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-slate-900 text-white min-h-screen fixed left-0 top-0 z-30">
        <div className="px-4 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-sm">🏠</div>
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
                pathname.startsWith(item.href)
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
            <span>🚪</span>
            {loggingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex">
        {navItems.slice(0, 5).map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? 'text-blue-600'
                : 'text-slate-500'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="mt-0.5 leading-tight">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
