import NavBar from '@/components/NavBar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <NavBar />
      <main className="flex-1 md:ml-56 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
