'use client'

interface Tab {
  key: string
  label: string
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (key: string) => void
}

export default function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="border-b border-slate-200">
      <nav className="-mb-px flex overflow-x-auto scrollbar-none" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`
                shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors
                ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }
              `}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
