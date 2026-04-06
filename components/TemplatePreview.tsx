'use client'

import SmsPreview from './SmsPreview'

interface TemplatePreviewProps {
  channel: string
  subject?: string
  bodyHtml?: string
  bodyText?: string
}

const SAMPLE_DATA: Record<string, string> = {
  first_name: 'John',
  last_name: 'Smith',
  rep_name: 'Kyle Dudgeon',
  dealership_name: 'Factory Direct Homes Center',
  rep_phone: '(555) 123-4567',
  rep_email: 'kyle@fdhc.com',
  dealership_phone: '(555) 999-8888',
  dealership_address: '123 Main St',
  model_name: 'The Aspire 2860',
  delivery_date: 'March 15, 2026',
}

function replaceVariables(text: string): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => SAMPLE_DATA[key] || match)
}

export default function TemplatePreview({
  channel,
  subject,
  bodyHtml,
  bodyText,
}: TemplatePreviewProps) {
  const renderedText = bodyText ? replaceVariables(bodyText) : ''
  const renderedHtml = bodyHtml ? replaceVariables(bodyHtml) : ''
  const renderedSubject = subject ? replaceVariables(subject) : ''

  if (channel === 'sms') {
    return (
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          SMS Preview
        </h3>
        <SmsPreview message={renderedText} />
      </div>
    )
  }

  if (channel === 'email') {
    return (
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Email Preview
        </h3>
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          {/* Email header */}
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span className="font-medium">From:</span>
              <span>Kyle Dudgeon &lt;kyle@fdhc.com&gt;</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span className="font-medium">To:</span>
              <span>John Smith &lt;john@example.com&gt;</span>
            </div>
            {renderedSubject && (
              <div className="flex items-center gap-2 text-sm text-slate-800 font-medium">
                <span className="text-xs text-slate-500 font-medium">Subject:</span>
                {renderedSubject}
              </div>
            )}
          </div>

          {/* Email body */}
          <div className="p-4 max-w-lg">
            {renderedHtml ? (
              <div
                className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            ) : (
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {renderedText || 'Preview will appear here...'}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // phone_script
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Phone Script Preview
      </h3>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{'\uD83D\uDCDE'}</span>
          <span className="text-sm font-semibold text-amber-800">Talking Points</span>
        </div>
        <div className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">
          {renderedText
            .split('\n')
            .map((line, i) => {
              const trimmed = line.trim()
              if (!trimmed) return <br key={i} />
              // Bold lines starting with * or -
              if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
                return (
                  <p key={i} className="mb-1 pl-3">
                    <span className="text-amber-600 mr-1">{'\u2022'}</span>
                    {trimmed.slice(1).trim()}
                  </p>
                )
              }
              // Bold lines in ALL CAPS or ending with :
              if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 || trimmed.endsWith(':')) {
                return (
                  <p key={i} className="mb-1 font-semibold">
                    {trimmed}
                  </p>
                )
              }
              return <p key={i} className="mb-1">{trimmed}</p>
            })}
        </div>
      </div>
    </div>
  )
}
