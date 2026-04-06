'use client'

import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current
    if (!dialog) return
    const rect = dialog.getBoundingClientRect()
    const clickedOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    if (clickedOutside) {
      onClose()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={`
        ${sizeClasses[size]} w-[calc(100%-2rem)] rounded-xl bg-white p-0 shadow-xl
        backdrop:bg-black/50 backdrop:backdrop-blur-sm
        open:animate-[slideUp_0.2s_ease-out] sm:open:animate-[fadeIn_0.15s_ease-out]
      `}
      style={{
        // Ensure the dialog is positioned at the bottom on mobile, center on desktop
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  )
}
