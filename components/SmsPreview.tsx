'use client'

interface SmsPreviewProps {
  message: string
}

export default function SmsPreview({ message }: SmsPreviewProps) {
  const charCount = message.length
  const segmentCount = charCount <= 160 ? 1 : Math.ceil(charCount / 153)

  return (
    <div className="flex flex-col items-center">
      {/* Phone mockup */}
      <div className="w-full max-w-[280px] bg-slate-900 rounded-[2rem] p-3 shadow-lg">
        {/* Status bar */}
        <div className="flex justify-between items-center px-4 py-1 text-white text-[10px]">
          <span>9:41</span>
          <div className="w-16 h-5 bg-slate-800 rounded-full" />
          <span>100%</span>
        </div>

        {/* Messages area */}
        <div className="bg-white rounded-2xl mt-1 p-3 min-h-[200px] flex flex-col">
          {/* Header */}
          <div className="text-center pb-2 border-b border-slate-100 mb-3">
            <p className="text-xs font-semibold text-slate-700">FDHC</p>
            <p className="text-[10px] text-slate-400">Text Message</p>
          </div>

          {/* Bubble */}
          <div className="flex justify-end mt-auto">
            <div className="bg-blue-500 text-white text-xs rounded-2xl rounded-br-sm px-3 py-2 max-w-[90%] whitespace-pre-wrap leading-relaxed">
              {message || 'Preview will appear here...'}
            </div>
          </div>
        </div>
      </div>

      {/* Character count */}
      <div className="mt-3 flex items-center gap-3 text-xs">
        <span className={`font-medium ${charCount > 160 ? 'text-amber-600' : 'text-slate-500'}`}>
          {charCount} characters
        </span>
        <span className="text-slate-300">|</span>
        <span className={`font-medium ${segmentCount > 1 ? 'text-amber-600' : 'text-slate-500'}`}>
          {segmentCount} {segmentCount === 1 ? 'segment' : 'segments'}
        </span>
        {segmentCount > 1 && (
          <span className="text-amber-500 text-[10px]">
            (multiple segments may increase cost)
          </span>
        )}
      </div>
    </div>
  )
}
