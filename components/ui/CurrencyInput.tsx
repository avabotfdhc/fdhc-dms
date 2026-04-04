'use client'

import { useState, useRef } from 'react'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  label: string
  name: string
}

function formatCurrency(val: number): string {
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function CurrencyInput({ value, onChange, label, name }: CurrencyInputProps) {
  const [focused, setFocused] = useState(false)
  const [rawInput, setRawInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const id = `field-${name}`

  function handleFocus() {
    setFocused(true)
    setRawInput(value === 0 ? '' : String(value))
  }

  function handleBlur() {
    setFocused(false)
    const parsed = parseFloat(rawInput)
    if (!isNaN(parsed)) {
      onChange(Math.round(parsed * 100) / 100)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    // Allow digits, one decimal point, and leading minus
    if (/^-?\d*\.?\d{0,2}$/.test(val) || val === '') {
      setRawInput(val)
    }
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
          $
        </span>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          value={focused ? rawInput : formatCurrency(value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          className="block w-full rounded-lg border border-slate-300 py-2.5 pl-7 pr-3 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-0"
        />
      </div>
    </div>
  )
}
