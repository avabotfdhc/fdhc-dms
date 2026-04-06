'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// CSV parser (no external deps)
// ---------------------------------------------------------------------------

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  for (const line of lines) {
    if (!line.trim()) continue
    const cols: string[] = []
    let cur = ''
    let inQuote = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        cols.push(cur.trim()); cur = ''
      } else {
        cur += ch
      }
    }
    cols.push(cur.trim())
    rows.push(cols)
  }
  return rows
}

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

const DB_FIELDS = [
  { value: '', label: '— skip —' },
  { value: 'first_name', label: 'First Name *' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'source', label: 'Source' },
  { value: 'land_status', label: 'Land Status' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'zip', label: 'ZIP Code' },
  { value: 'notes', label: 'Notes' },
]

const LAND_STATUS_MAP: Record<string, string> = {
  'owns land': 'owns_land',
  'own land': 'owns_land',
  'owns_land': 'owns_land',
  'buying land': 'buying_land',
  'buy land': 'buying_land',
  'buying_land': 'buying_land',
  'needs land': 'needs_land',
  'need land': 'needs_land',
  'needs_land': 'needs_land',
  'renting lot': 'renting_lot',
  'rent lot': 'renting_lot',
  'renting_lot': 'renting_lot',
}

function normalizeLandStatus(v: string): string {
  return LAND_STATUS_MAP[v.toLowerCase().trim()] || 'unknown'
}

/** Guess best DB field from a CSV header name */
function guessField(header: string): string {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '_')
  if (h.includes('first')) return 'first_name'
  if (h.includes('last')) return 'last_name'
  if (h.includes('email')) return 'email'
  if (h.includes('phone') || h.includes('mobile') || h.includes('cell')) return 'phone'
  if (h.includes('source') || h.includes('lead_source')) return 'source'
  if (h.includes('land')) return 'land_status'
  if (h.includes('address') || h.includes('street')) return 'address'
  if (h.includes('city')) return 'city'
  if (h.includes('state')) return 'state'
  if (h.includes('zip') || h.includes('postal')) return 'zip'
  if (h.includes('note') || h.includes('comment') || h.includes('message')) return 'notes'
  return ''
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ImportResult {
  imported: number
  skipped: number
  errors: number
  details: Array<{ row: number; status: string; reason?: string; client_id?: string }>
}

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<string[]>([])
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  const loadFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a CSV file.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length < 2) {
        setError('File must have a header row and at least one data row.')
        return
      }
      const [hdrs, ...dataRows] = parsed
      setHeaders(hdrs)
      setRows(dataRows)
      setMapping(hdrs.map(guessField))
      setError('')
      setStep('map')
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }, [loadFile])

  function buildLeads() {
    return rows.map(row => {
      const lead: Record<string, string> = {}
      mapping.forEach((field, i) => {
        if (field && row[i] !== undefined) {
          lead[field] = field === 'land_status' ? normalizeLandStatus(row[i]) : row[i]
        }
      })
      return lead
    })
  }

  async function runImport() {
    setImporting(true)
    setError('')
    try {
      const leads = buildLeads()
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setResult(data)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const previewLeads = buildLeads().slice(0, 5)
  const firstNameMapped = mapping.includes('first_name')

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clients" className="text-slate-400 hover:text-slate-600 text-sm">← Clients</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-bold text-slate-900">Import Leads</h1>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {(['upload', 'map', 'preview', 'done'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-slate-200" />}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              step === s ? 'bg-blue-100 text-blue-700' :
              (['map', 'preview', 'done'].indexOf(s) <= ['map', 'preview', 'done'].indexOf(step as typeof s)
                ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')
            }`}>
              <span>{i + 1}</span>
              <span className="capitalize">{s === 'map' ? 'Map Fields' : s === 'done' ? 'Complete' : s.charAt(0).toUpperCase() + s.slice(1)}</span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <div className="text-4xl mb-3">📂</div>
            <p className="text-lg font-medium text-slate-700 mb-1">Drop your CSV file here</p>
            <p className="text-sm text-slate-500">or click to browse</p>
            <p className="text-xs text-slate-400 mt-3">CSV format • Up to 500 leads per import</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) loadFile(e.target.files[0]) }}
            />
          </div>

          <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-2">Expected CSV columns:</p>
            <p className="text-xs text-slate-500 font-mono">
              first_name, last_name, email, phone, source, land_status, address, city, state, zip, notes
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Only <strong>first_name</strong> is required. Column order doesn&apos;t matter — you&apos;ll map them in the next step.
            </p>
            <a
              href="data:text/csv;charset=utf-8,first_name,last_name,email,phone,source,land_status,address,city,state,zip,notes%0AJane,Doe,jane@example.com,555-1234,website,owns_land,123 Main St,Springfield,IN,47401,"
              download="leads-template.csv"
              className="inline-block mt-3 text-xs text-blue-600 hover:underline"
            >
              Download template CSV →
            </a>
          </div>
        </div>
      )}

      {/* Step 2: Map fields */}
      {step === 'map' && (
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-4">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-700">
                Map CSV columns → database fields
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {rows.length} rows detected. Auto-matched where possible.
              </p>
            </div>
            <div className="divide-y divide-slate-50">
              {headers.map((header, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-2.5">
                  <div className="w-40 text-sm font-mono text-slate-600 truncate">{header}</div>
                  <div className="text-slate-400 text-sm">→</div>
                  <select
                    value={mapping[i] || ''}
                    onChange={e => {
                      const m = [...mapping]
                      m[i] = e.target.value
                      setMapping(m)
                    }}
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DB_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <div className="w-32 text-xs text-slate-400 truncate">
                    Sample: {rows[0]?.[i] || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!firstNameMapped && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Map at least one column to <strong>First Name</strong> before continuing.
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep('preview')}
              disabled={!firstNameMapped}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Preview →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-4">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-700">
                Preview — first {Math.min(5, rows.length)} of {rows.length} leads
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {DB_FIELDS.filter(f => f.value && mapping.includes(f.value)).map(f => (
                      <th key={f.value} className="px-3 py-2 text-left text-xs font-medium text-slate-500">{f.label.replace(' *', '')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {previewLeads.map((lead, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {DB_FIELDS.filter(f => f.value && mapping.includes(f.value)).map(f => (
                        <td key={f.value} className="px-3 py-2 text-slate-700 text-xs">
                          {lead[f.value] || <span className="text-slate-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 text-sm text-blue-800">
            <strong>{rows.length}</strong> leads will be imported. Duplicates (same email or phone) will be skipped automatically.
            Each new lead will be <strong>assigned via round-robin</strong> and enrolled in the <strong>New Lead Sequence</strong>.
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('map')}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600"
            >
              ← Back
            </button>
            <button
              onClick={runImport}
              disabled={importing}
              className="px-6 py-2 text-sm bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {importing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Importing…
                </span>
              ) : `Import ${rows.length} Leads`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && result && (
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-4 text-center">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Import Complete!</h2>
            <p className="text-slate-500 text-sm">All leads have been processed and assigned.</p>

            <div className="flex justify-center gap-6 mt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{result.imported}</p>
                <p className="text-sm text-slate-500">Imported</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-500">{result.skipped}</p>
                <p className="text-sm text-slate-500">Skipped (duplicate)</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-500">{result.errors}</p>
                <p className="text-sm text-slate-500">Errors</p>
              </div>
            </div>
          </div>

          {result.errors > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-4">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-700">Error details</p>
              </div>
              <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                {result.details.filter(d => d.status === 'error').map(d => (
                  <div key={d.row} className="px-4 py-2 flex justify-between text-sm">
                    <span className="text-slate-600">Row {d.row}</span>
                    <span className="text-red-600 text-xs">{d.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setStep('upload'); setResult(null); setHeaders([]); setRows([]); setMapping([]) }}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600"
            >
              Import Another File
            </button>
            <Link
              href="/clients"
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              View Clients →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
