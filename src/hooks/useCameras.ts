import { useState, useEffect, useCallback } from 'react'
import type { Camera, ServerCamera, Alert } from '@/types/camera'

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
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [motionActive, setMotionActive] = useState(false)
  const [networkOk, setNetworkOk] = useState(true)
  const [repairingNetwork, setRepairingNetwork] = useState(false)

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

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/alerts`)
      if (!res.ok) return
      setAlerts(await res.json())
    } catch {}
  }, [])

  const fetchMotionStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/motion/status`)
      if (!res.ok) return
      const { active } = await res.json()
      setMotionActive(!!active)
    } catch {}
  }, [])

  const fetchNetworkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/network/status`)
      if (!res.ok) return
      const { active } = await res.json()
      setNetworkOk(!!active)
    } catch {}
  }, [])

  const repairNetwork = useCallback(async () => {
    setRepairingNetwork(true)
    try {
      const res = await fetch(`${API}/api/network/repair`, { method: 'POST' })
      const data = await res.json()
      setNetworkOk(!!data.active)
      await fetchCameras()
    } finally {
      setRepairingNetwork(false)
    }
  }, [fetchCameras])

  useEffect(() => {
    fetchCameras()
    fetchRecordings()
    fetchStats()
    fetchMeta()
    fetchAlerts()
    fetchMotionStatus()
    fetchNetworkStatus()
    const fast = setInterval(() => { fetchCameras(); fetchRecordings(); fetchAlerts(); fetchMotionStatus() }, 5000)
    // Network alias state only changes on Mac reboot/logout — no need to
    // check it as often as camera state, so it rides the slow interval
    // instead of piling another request onto every 5s tick.
    const slow = setInterval(() => { fetchMeta(); fetchStats(); fetchNetworkStatus() }, 30000)
    return () => { clearInterval(fast); clearInterval(slow) }
  }, [fetchCameras, fetchRecordings, fetchMeta, fetchStats, fetchAlerts, fetchMotionStatus, fetchNetworkStatus])

  const renameCamera = useCallback(async (id: string, label: string, zone: string) => {
    await fetch(`${API}/api/cameras/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, zone }),
    })
    await fetchCameras()
  }, [fetchCameras])

  const toggleCameraEnabled = useCallback(async (id: string, enabled: boolean) => {
    await fetch(`${API}/api/cameras/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    await fetchCameras()
  }, [fetchCameras])

  const toggleCameraMotion = useCallback(async (id: string, motionEnabled: boolean) => {
    await fetch(`${API}/api/cameras/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motionEnabled }),
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

  const deleteAllRecordings = useCallback(async () => {
    const res = await fetch(`${API}/api/recordings`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete recordings')
    await fetchRecordings()
  }, [fetchRecordings])

  const startMotion = useCallback(async () => {
    await fetch(`${API}/api/motion/start`, { method: 'POST' })
    await fetchMotionStatus()
  }, [fetchMotionStatus])

  const stopMotion = useCallback(async () => {
    await fetch(`${API}/api/motion/stop`, { method: 'POST' })
    await fetchMotionStatus()
    await fetchCameras() // per-camera motionActive flags clear immediately server-side
  }, [fetchMotionStatus, fetchCameras])

  return {
    cameras, selected, setSelected,
    loading, serverOk, recordings, diskPercent, recordingsSizeBytes,
    alerts, motionActive, startMotion, stopMotion,
    networkOk, repairingNetwork, repairNetwork,
    addCamera, renameCamera, removeCamera, toggleCameraEnabled, toggleCameraMotion,
    startRecording, stopRecording,
    snapshotUrl, fetchRecordings, deleteRecording, deleteAllRecordings,
  }
}
