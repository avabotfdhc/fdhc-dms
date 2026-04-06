import NavBar from '@/components/NavBar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <NavBar />
      {/* md:ml-56 = sidebar width; mt-14 on mobile for fixed top header; pb-20 for bottom nav */}
      <main className="flex-1 md:ml-56 mt-14 md:mt-0 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
