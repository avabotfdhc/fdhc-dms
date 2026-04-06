'use client'

import type { ChangeEvent } from 'react'

interface BaseProps {
  label: string
  name: string
  value: string | number
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  error?: string
  required?: boolean
  placeholder?: string
  helpText?: string
}

interface InputProps extends BaseProps {
  type?: 'text' | 'email' | 'tel' | 'number'
}

interface TextareaProps extends BaseProps {
  type: 'textarea'
}

interface SelectProps extends BaseProps {
  type: 'select'
  options: { value: string; label: string }[]
}

type FormFieldProps = InputProps | TextareaProps | SelectProps

const baseInputClasses =
  'block w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0'

function inputClasses(hasError: boolean) {
  return `${baseInputClasses} ${
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
  }`
}

export default function FormField(props: FormFieldProps) {
  const { label, name, value, onChange, error, required, placeholder, helpText } = props

  const id = `field-${name}`

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      {props.type === 'textarea' ? (
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={4}
          className={inputClasses(!!error)}
        />
      ) : props.type === 'select' ? (
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className={inputClasses(!!error)}
        >
          <option value="">{placeholder || 'Select...'}</option>
          {props.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={name}
          type={props.type || 'text'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={inputClasses(!!error)}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {helpText && !error && <p className="text-sm text-slate-500">{helpText}</p>}
    </div>
  )
}
