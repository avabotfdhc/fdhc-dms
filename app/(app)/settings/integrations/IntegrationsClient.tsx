'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  isAdmin: boolean
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="text-xs px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-600 ml-2 flex-shrink-0"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="relative">
      <pre className="bg-slate-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">{children}</pre>
      <CopyButton text={children} />
    </div>
  )
}

export default function IntegrationsClient({ isAdmin }: Props) {
  const [activeTab, setActiveTab] = useState<'webhook' | 'form' | 'facebook' | 'zapier' | 'import'>('webhook')

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'
  const webhookUrl = `${origin}/api/webhooks/lead`
  const formUrl = `${origin}/lead-form`

  const tabs = [
    { id: 'webhook' as const, label: 'Webhook / API', icon: '🔗' },
    { id: 'form' as const, label: 'Web Form', icon: '📋' },
    { id: 'facebook' as const, label: 'Facebook Ads', icon: '📘' },
    { id: 'zapier' as const, label: 'Zapier / Make', icon: '⚡' },
    { id: 'import' as const, label: 'CSV Import', icon: '📂' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/settings" className="text-slate-400 hover:text-slate-600 text-sm">← Settings</Link>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Lead Integrations</h1>
      <p className="text-slate-500 text-sm mb-6">
        Connect your lead sources so new leads automatically appear in the DMS and get assigned via round-robin.
      </p>

      {!isAdmin && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Admin access required to view API keys. Contact your administrator.
        </div>
      )}

      {/* API Key notice */}
      {isAdmin && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-900 mb-1">🔑 API Key Setup</p>
          <p className="text-sm text-blue-800 mb-2">
            Set <code className="bg-blue-100 px-1 rounded">LEAD_INTAKE_API_KEY</code> in your Vercel environment variables.
            Use this key in all integration requests below.
          </p>
          <p className="text-xs text-blue-600">
            Vercel Dashboard → Your Project → Settings → Environment Variables → Add <strong>LEAD_INTAKE_API_KEY</strong>
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Webhook tab */}
      {activeTab === 'webhook' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-1">Webhook Endpoint</h2>
            <p className="text-sm text-slate-500 mb-3">
              Send a POST request from any system to add a lead instantly. The lead will be assigned round-robin and enrolled in the New Lead follow-up sequence.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 bg-slate-100 px-3 py-2 rounded-lg text-sm font-mono break-all">{webhookUrl}</code>
              <CopyButton text={webhookUrl} />
            </div>

            <p className="text-xs font-medium text-slate-700 mb-2">Example request:</p>
            <CodeBlock>{`curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_LEAD_INTAKE_API_KEY" \\
  -d '{
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "phone": "555-123-4567",
    "source": "website",
    "land_status": "owns_land",
    "notes": "Interested in 3/2 on 2 acres"
  }'`}</CodeBlock>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-1">Accepted Fields</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-xs text-slate-500 font-medium">Field</th>
                    <th className="text-left py-2 text-xs text-slate-500 font-medium">Required</th>
                    <th className="text-left py-2 text-xs text-slate-500 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {[
                    ['first_name', 'Yes', 'Lead\'s first name'],
                    ['last_name', 'No', 'Lead\'s last name'],
                    ['email', 'No', 'Email address (used for deduplication)'],
                    ['phone', 'No', 'Phone number (used for deduplication)'],
                    ['source', 'No', 'Lead source (website, facebook, zillow…)'],
                    ['land_status', 'No', 'owns_land | buying_land | needs_land | renting_lot | unknown'],
                    ['notes', 'No', 'Additional comments or message'],
                    ['address / city / state / zip', 'No', 'Physical address fields'],
                  ].map(([f, r, d]) => (
                    <tr key={f}>
                      <td className="py-2 font-mono text-slate-700">{f}</td>
                      <td className="py-2 text-slate-500">{r}</td>
                      <td className="py-2 text-slate-500">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-1">Response Format</h2>
            <CodeBlock>{`// 201 Created — new lead imported
{
  "success": true,
  "client_id": "uuid",
  "assigned_to": "rep-uuid",
  "assigned_rep": "John Smith"
}

// 200 OK — duplicate detected, no action taken
{
  "message": "Duplicate lead — client already exists",
  "client_id": "existing-uuid"
}`}</CodeBlock>
          </div>
        </div>
      )}

      {/* Web Form tab */}
      {activeTab === 'form' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-1">Hosted Lead Form</h2>
            <p className="text-sm text-slate-500 mb-3">
              Share this URL directly or embed it in an iframe on your website. No login required — anyone can submit a lead.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 bg-slate-100 px-3 py-2 rounded-lg text-sm font-mono break-all">{formUrl}</code>
              <CopyButton text={formUrl} />
            </div>
            <a href={formUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Open Form ↗
            </a>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-2">Embed on Your Website</h2>
            <p className="text-sm text-slate-500 mb-3">
              Copy and paste this code snippet anywhere in your website&apos;s HTML to embed the form:
            </p>
            <CodeBlock>{`<iframe
  src="${formUrl}"
  width="100%"
  height="680"
  frameborder="0"
  style="border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);"
  title="Contact Us"
></iframe>`}</CodeBlock>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-medium text-amber-800 mb-1">⚠️ Important</p>
            <p className="text-sm text-amber-700">
              The web form uses <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_LEAD_FORM_API_KEY</code> to authenticate.
              Set this to the same value as <code className="bg-amber-100 px-1 rounded">LEAD_INTAKE_API_KEY</code> in Vercel (it must be prefixed with <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_</code> to be available in the browser).
            </p>
          </div>
        </div>
      )}

      {/* Facebook Ads tab */}
      {activeTab === 'facebook' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-1">Facebook Lead Ads Integration</h2>
            <p className="text-sm text-slate-500 mb-4">
              Use <strong>Zapier</strong> or <strong>Meta&apos;s Lead Access</strong> to forward Facebook Lead Ads directly to your webhook.
            </p>

            <div className="space-y-4">
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-medium text-slate-800 text-sm mb-2">Option A — via Zapier (Recommended)</h3>
                <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                  <li>Create a new Zap in Zapier</li>
                  <li>Trigger: <strong>Facebook Lead Ads → New Lead</strong></li>
                  <li>Action: <strong>Webhooks by Zapier → POST</strong></li>
                  <li>URL: <code className="bg-slate-100 px-1 rounded text-xs">{webhookUrl}</code></li>
                  <li>Headers: <code className="bg-slate-100 px-1 rounded text-xs">x-api-key: YOUR_KEY</code></li>
                  <li>Map fields: full_name, email, phone_number from Facebook</li>
                </ol>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-medium text-slate-800 text-sm mb-2">Option B — Facebook Lead Ads Webhook</h3>
                <p className="text-sm text-slate-600 mb-2">
                  In Meta Business Suite → Leads Center → CRM Integration, set:
                </p>
                <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                  <li>Callback URL: <code className="bg-slate-100 px-1 rounded text-xs">{webhookUrl}</code></li>
                  <li>Verify Token: <em>your LEAD_INTAKE_API_KEY</em></li>
                  <li>Subscribe to: <strong>leadgen</strong> events</li>
                </ul>
                <p className="text-xs text-slate-400 mt-2">The webhook automatically handles Facebook&apos;s field_data array format and the hub.challenge verification.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zapier / Make tab */}
      {activeTab === 'zapier' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-1">Zapier / Make / n8n</h2>
            <p className="text-sm text-slate-500 mb-4">
              Connect any lead source through automation platforms to auto-import leads into the DMS.
            </p>

            <div className="border border-slate-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-slate-800 text-sm mb-2">Zapier Setup</h3>
              <ol className="text-sm text-slate-600 space-y-1.5 list-decimal list-inside">
                <li>Create a new Zap with your lead source trigger (Facebook, Zillow, website form, etc.)</li>
                <li>Add action: <strong>Webhooks by Zapier → Custom Request</strong></li>
                <li>Set Method: <strong>POST</strong></li>
                <li>URL: <code className="bg-slate-100 px-1 rounded text-xs">{webhookUrl}</code></li>
                <li>Add header: <code className="bg-slate-100 px-1 rounded text-xs">x-api-key</code> → your API key</li>
                <li>Add header: <code className="bg-slate-100 px-1 rounded text-xs">Content-Type: application/json</code></li>
                <li>Map your trigger fields to: first_name, last_name, email, phone, source, land_status</li>
              </ol>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="font-medium text-slate-800 text-sm mb-2">Make (formerly Integromat) Setup</h3>
              <ol className="text-sm text-slate-600 space-y-1.5 list-decimal list-inside">
                <li>Add an <strong>HTTP → Make a Request</strong> module</li>
                <li>URL: <code className="bg-slate-100 px-1 rounded text-xs">{webhookUrl}</code></li>
                <li>Method: <strong>POST</strong></li>
                <li>Headers: <code className="bg-slate-100 px-1 rounded text-xs">x-api-key: YOUR_KEY</code></li>
                <li>Body type: <strong>JSON (application/json)</strong></li>
                <li>Map the JSON body fields from your trigger</li>
              </ol>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-2">Common Lead Sources</h2>
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
              {['Facebook Lead Ads', 'Zillow', 'Realtor.com', 'Homes.com', 'Website Contact Form', 'Google Ads', 'MHVillage', 'Manufactured Homes'].map(s => (
                <div key={s} className="flex items-center gap-2 p-2 border border-slate-100 rounded-lg">
                  <span className="text-green-500">✓</span> {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CSV Import tab */}
      {activeTab === 'import' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-1">Bulk CSV Import</h2>
            <p className="text-sm text-slate-500 mb-4">
              Import an existing list of leads from a spreadsheet. All leads will be assigned round-robin and enrolled in the New Lead Sequence.
            </p>
            <Link
              href="/clients/import"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
            >
              📂 Open CSV Importer →
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-2">Supported Columns</h2>
            <p className="text-xs text-slate-400 font-mono mb-3">
              first_name, last_name, email, phone, source, land_status, address, city, state, zip, notes
            </p>
            <a
              href="data:text/csv;charset=utf-8,first_name,last_name,email,phone,source,land_status,address,city,state,zip,notes%0AJane,Doe,jane@example.com,555-1234,website,owns_land,123 Main St,Springfield,IN,47401,"
              download="leads-template.csv"
              className="text-sm text-blue-600 hover:underline"
            >
              Download template CSV →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
