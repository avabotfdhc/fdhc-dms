'use client'

import { useState, FormEvent } from 'react'

/**
 * Public lead capture form — no login required.
 * Embed on your website or share the URL directly.
 * Submits to /api/webhooks/lead using the LEAD_INTAKE_API_KEY.
 */

export default function LeadFormPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const data = new FormData(form)

    const payload = {
      first_name: data.get('first_name') as string,
      last_name: data.get('last_name') as string,
      email: data.get('email') as string,
      phone: data.get('phone') as string,
      land_status: data.get('land_status') as string,
      notes: data.get('notes') as string,
      source: 'web_form',
    }

    try {
      const apiKey = process.env.NEXT_PUBLIC_LEAD_FORM_API_KEY || ''
      const res = await fetch('/api/webhooks/lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok && res.status !== 200) {
        throw new Error(json.error || 'Submission failed')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🏡</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h2>
          <p className="text-slate-600">
            We&apos;ve received your information and a member of our team will reach out to you shortly.
          </p>
          <p className="text-sm text-slate-400 mt-4">
            Factory Direct Homes Center
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🏡</div>
          <h1 className="text-2xl font-bold text-slate-900">Find Your Dream Home</h1>
          <p className="text-slate-500 text-sm mt-1">
            Tell us a little about yourself and we&apos;ll be in touch right away.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                name="first_name"
                type="text"
                required
                placeholder="Jane"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
              <input
                name="last_name"
                type="text"
                placeholder="Doe"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <input
              name="email"
              type="email"
              placeholder="jane@example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
            <input
              name="phone"
              type="tel"
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Land status */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Do you have land for the home?
            </label>
            <select
              name="land_status"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="unknown">Not sure yet</option>
              <option value="owns_land">Yes, I own land</option>
              <option value="buying_land">I&apos;m buying land</option>
              <option value="needs_land">I need to find land</option>
              <option value="renting_lot">I&apos;ll rent a lot</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Anything else you&apos;d like us to know?
            </label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Bedrooms, budget, timeline…"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending…' : 'Request Information →'}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-4">
          We respect your privacy. Your information will never be shared.
        </p>
      </div>
    </div>
  )
}
