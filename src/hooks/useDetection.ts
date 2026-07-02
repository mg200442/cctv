import { useState, useEffect, useCallback, useRef } from 'react'
import type { Detection, DetectionStatus } from '@/types/camera'

const API = ''

const IDLE_STATUS: DetectionStatus = { running: false, done: 0, total: 0, currentFile: null, startedAt: null }

export const detectionFrameUrl = (frame: string) => `${API}/detection-frames/${frame}`

export function useDetection() {
  const [status, setStatus] = useState<DetectionStatus>(IDLE_STATUS)
  const [results, setResults] = useState<Detection[]>([])
  const [loading, setLoading] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/detect/results`)
      if (!res.ok) return
      setResults(await res.json())
    } catch {}
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/detect/status`)
      if (!res.ok) return
      const data: DetectionStatus = await res.json()
      setStatus(data)
      return data
    } catch {}
  }, [])

  // Poll status every 2s only while a job is actually running — this is a
  // manual on-demand feature, no reason to poll when idle (unlike the
  // camera/alerts polling in useCameras, which always runs).
  useEffect(() => {
    fetchStatus().then(() => setLoading(false))
    fetchResults()
  }, [fetchStatus, fetchResults])

  useEffect(() => {
    if (!status.running) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      return
    }
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      const data = await fetchStatus()
      if (data && !data.running) {
        fetchResults() // job just finished — pick up the new results
      }
    }, 2000)
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [status.running, fetchStatus, fetchResults])

  const run = useCallback(async () => {
    const res = await fetch(`${API}/api/detect/run`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'No se pudo iniciar el análisis')
    }
    await fetchStatus()
  }, [fetchStatus])

  const stop = useCallback(async () => {
    await fetch(`${API}/api/detect/stop`, { method: 'POST' })
    await fetchStatus()
  }, [fetchStatus])

  const clearResults = useCallback(async () => {
    const res = await fetch(`${API}/api/detect/results`, { method: 'DELETE' })
    if (!res.ok) throw new Error('No se pudo borrar el historial')
    setResults([])
  }, [])

  return { status, results, loading, run, stop, clearResults }
}
