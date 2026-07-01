import { useState, useEffect, useCallback } from 'react'
import type { Camera, ServerCamera } from '@/types/camera'

const API = ''

// Purely cosmetic per-slot background/fps dressing (shown behind/around the
// real video feed) — `boxes` is intentionally NOT part of this: there is no
// AI detection backend, so box overlays are never fabricated (see mergeScene).
const SCENE_DATA: Record<string, Pick<Camera, 'scene' | 'offline' | 'fps'>> = {
  'cam-01': {
    scene: 'radial-gradient(130% 95% at 50% 118%, #3a2a16 0%, #1a130b 42%, #0a0a0b 100%)',
    fps: '15fps',
  },
  'cam-02': {
    scene: 'linear-gradient(180deg, #0b1925 0%, #0a1018 55%, #060a0e 100%)',
    fps: '25fps',
  },
  'cam-03': {
    scene: 'radial-gradient(110% 90% at 32% 14%, #232a38 0%, #121620 50%, #0a0c10 100%)',
    fps: '25fps',
  },
  'cam-04': {
    scene: 'radial-gradient(120% 110% at 50% 38%, #0f2a1b 0%, #08160e 55%, #050b07 100%)',
    fps: '25fps',
  },
  'cam-05': {
    scene: 'linear-gradient(180deg, #0a0f1c 0%, #070a12 60%, #04060a 100%)',
    fps: '25fps',
  },
  'cam-06': {
    scene: 'linear-gradient(180deg, #141414 0%, #0c0c0c 100%)',
    offline: true,
    fps: 'OFFLINE',
  },
}

const DEFAULT_SCENE = {
  scene: 'radial-gradient(100% 100% at 50% 50%, #1a1a2e 0%, #0d0d1a 100%)',
  fps: '—',
}

function mergeScene(cam: ServerCamera): Camera {
  const scene = SCENE_DATA[cam.id] ?? DEFAULT_SCENE
  return {
    ...cam,
    ...scene,
    boxes: [], // no real AI detection backend exists — never fabricate boxes over a live feed
    offline: scene.offline && !cam.streaming,
  }
}

export interface Recording {
  name: string
  cameraId: string
  date: string
  time: string
  url: string
  size: number      // bytes from server stat
  duration: number  // seconds, filled by /meta endpoint
}

function parseRecording(item: { name: string; size?: number; duration?: number }): Recording {
  const { name, size = 0, duration = 0 } = item
  // e.g. cam-01_2026-06-30T17-04-36.mp4
  const [cameraId, rest] = name.replace('.mp4', '').split('_')
  const [date, rawTime] = rest?.split('T') ?? ['', '']
  const time = rawTime?.replace(/-/g, ':') ?? ''
  return { name, cameraId, date, time, url: `/recordings/${name}`, size, duration }
}

export function useCameras() {
  const [cameras, setCameras] = useState<Camera[]>([])
  const [selected, setSelected] = useState<number | null>(0)
  const [loading, setLoading] = useState(true)
  const [serverOk, setServerOk] = useState(false)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [diskPercent, setDiskPercent] = useState(0)
  const [recordingsSizeBytes, setRecordingsSizeBytes] = useState(0)

  const fetchCameras = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/cameras`)
      if (!res.ok) throw new Error('Server error')
      const data: ServerCamera[] = await res.json()
      setCameras(data.map(mergeScene))
      setServerOk(true)
    } catch {
      setServerOk(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRecordings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/recordings`)
      if (!res.ok) return
      const data: { name: string; size: number }[] = await res.json()
      setRecordings(prev => {
        const next = data.map(r => parseRecording(r)).reverse()
        // Preserve duration values already fetched from /meta
        return next.map(r => {
          const existing = prev.find(p => p.name === r.name)
          return existing?.duration ? { ...r, duration: existing.duration } : r
        })
      })
    } catch {}
  }, [])

  // Fetch real duration via ffmpeg — slow, runs every 30s
  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/recordings/meta`)
      if (!res.ok) return
      const meta: { name: string; duration: number; size: number }[] = await res.json()
      setRecordings(prev => prev.map(rec => {
        const m = meta.find(m => m.name === rec.name)
        return m ? { ...rec, duration: m.duration, size: m.size } : rec
      }))
    } catch {}
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/stats`)
      if (!res.ok) return
      const { diskPercent: pct, recordingsTotalBytes } = await res.json()
      setDiskPercent(pct)
      if (typeof recordingsTotalBytes === 'number') setRecordingsSizeBytes(recordingsTotalBytes)
    } catch {}
  }, [])

  useEffect(() => {
    fetchCameras()
    fetchRecordings()
    fetchStats()
    fetchMeta()
    const fast = setInterval(() => { fetchCameras(); fetchRecordings() }, 5000)
    const slow = setInterval(() => { fetchMeta(); fetchStats() }, 30000)
    return () => { clearInterval(fast); clearInterval(slow) }
  }, [fetchCameras, fetchRecordings, fetchMeta, fetchStats])

  const renameCamera = useCallback(async (id: string, label: string, zone: string) => {
    await fetch(`${API}/api/cameras/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, zone }),
    })
    await fetchCameras()
  }, [fetchCameras])

  const addCamera = useCallback(async (label: string, zone: string, rtsp: string) => {
    const res = await fetch(`${API}/api/cameras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, zone, rtsp }),
    })
    if (!res.ok) throw new Error('Failed to add camera')
    await fetchCameras()
  }, [fetchCameras])

  const removeCamera = useCallback(async (id: string) => {
    await fetch(`${API}/api/cameras/${id}`, { method: 'DELETE' })
    setCameras(prev => {
      const next = prev.filter(c => c.id !== id)
      if (selected !== null && selected >= next.length) setSelected(next.length ? next.length - 1 : null)
      return next
    })
  }, [selected])

  const startRecording = useCallback(async (id: string) => {
    await fetch(`${API}/api/cameras/${id}/record/start`, { method: 'POST' })
    await fetchCameras()
  }, [fetchCameras])

  const stopRecording = useCallback(async (id: string) => {
    await fetch(`${API}/api/cameras/${id}/record/stop`, { method: 'POST' })
    await fetchCameras()
  }, [fetchCameras])

  const snapshotUrl = (id: string) => `${API}/snapshot/${id}`

  const deleteRecording = useCallback(async (name: string) => {
    const res = await fetch(`${API}/api/recordings/${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete recording')
    await fetchRecordings()
  }, [fetchRecordings])

  return {
    cameras, selected, setSelected,
    loading, serverOk, recordings, diskPercent, recordingsSizeBytes,
    addCamera, renameCamera, removeCamera,
    startRecording, stopRecording,
    snapshotUrl, fetchRecordings, deleteRecording,
  }
}
