'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type AutoSaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

interface UseAutoSaveOptions {
  /** Supabase table name */
  table: string
  /** Row primary key value */
  id: string
  /** Current form data to persist */
  data: Record<string, unknown>
  /** Debounce delay in ms (default 1500) */
  debounceMs?: number
  /** Disable auto-save (e.g. when form is invalid) */
  enabled?: boolean
}

interface UseAutoSaveReturn {
  /** Current save status */
  status: AutoSaveStatus
  /** Trigger an immediate save, bypassing debounce */
  saveNow: () => Promise<void>
  /** Last error message, if any */
  error: string | null
}

/**
 * Custom hook for auto-saving form data to Supabase.
 *
 * Debounces writes at 1500ms (configurable). Shows a beforeunload warning
 * when there are unsaved changes. Provides `saveNow()` for immediate flush.
 *
 * @example
 * const { status, saveNow } = useAutoSave({
 *   table: 'clients',
 *   id: clientId,
 *   data: formData,
 * })
 */
export function useAutoSave({
  table,
  id,
  data,
  debounceMs = 1500,
  enabled = true,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('saved')
  const [error, setError] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestDataRef = useRef(data)
  const isMountedRef = useRef(true)
  const initialDataRef = useRef<string | null>(null)

  // Keep latest data in ref so the save function always uses current values
  latestDataRef.current = data

  // Capture initial data snapshot on first render (or when id changes)
  useEffect(() => {
    initialDataRef.current = JSON.stringify(data)
    setStatus('saved')
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const performSave = useCallback(async () => {
    if (!id || !table) return

    const payload = latestDataRef.current
    setStatus('saving')
    setError(null)

    try {
      const supabase = createClient()
      const { error: saveError } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)

      if (!isMountedRef.current) return

      if (saveError) {
        setStatus('error')
        setError(saveError.message)
      } else {
        setStatus('saved')
        initialDataRef.current = JSON.stringify(payload)
      }
    } catch (err) {
      if (!isMountedRef.current) return
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }, [id, table])

  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    await performSave()
  }, [performSave])

  // Debounced auto-save when data changes
  useEffect(() => {
    if (!enabled || !id) return

    const currentJson = JSON.stringify(data)
    if (currentJson === initialDataRef.current) {
      // Data hasn't actually changed from last saved state
      return
    }

    setStatus('unsaved')

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      performSave()
    }, debounceMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [data, debounceMs, enabled, id, performSave])

  // Warn before closing tab when there are unsaved changes
  useEffect(() => {
    if (status !== 'unsaved') return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [status])

  return { status, saveNow, error }
}
