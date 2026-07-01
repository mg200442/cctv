import { useState, useEffect, useCallback, useRef } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { CameraGrid } from '@/components/CameraGrid'
import { RightRail } from '@/components/RightRail'
import { Timeline } from '@/components/Timeline'
import { AddCameraModal } from '@/components/AddCameraModal'
import { RecPanel, type Tab as RecTab } from '@/components/RecPanel'
import { FullscreenModal } from '@/components/FullscreenModal'
import { CameraRecsModal } from '@/components/CameraRecsModal'
import { SettingsModal } from '@/components/SettingsModal'
import { RenameCameraModal } from '@/components/RenameCameraModal'
import { useCameras } from '@/hooks/useCameras'
import { ALERTS, DEVICES } from '@/data/cameras'

const DEFAULT_MAX_STORAGE_GB = 10

function playAlertBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
  } catch (_) {}
}

function loadMaxStorageGB(): number {
  try {
    const v = localStorage.getItem('maxStorageGB')
    if (v) { const n = parseFloat(v); if (n > 0) return n }
  } catch {}
  return DEFAULT_MAX_STORAGE_GB
}

export default function App() {
  const [now, setNow] = useState(new Date())
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(95.5)
  const [live, setLive] = useState(true)
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Navigation & overlay state
  const [activeView, setActiveView] = useState<string>('live')
  const [recTab, setRecTab] = useState<RecTab>('rec')
  const [alertsSeen, setAlertsSeen] = useState(false)
  const [fullscreenIdx, setFullscreenIdx] = useState<number | null>(null)
  const [cameraRecsId, setCameraRecsId] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [maxStorageGB, setMaxStorageGB] = useState<number>(loadMaxStorageGB)
  const [renamingCameraId, setRenamingCameraId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const {
    cameras, selected, setSelected, serverOk, recordings, diskPercent,
    recordingsSizeBytes, addCamera, renameCamera, removeCamera,
    startRecording, stopRecording, snapshotUrl, deleteRecording,
  } = useCameras()

  const filteredCameras = searchQuery.trim()
    ? cameras.filter(c =>
        c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.zone.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : cameras

  const camerasOnline = cameras.filter(c => !c.offline).length

  // Clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Alert notifications when a new recording appears
  const notifMounted = useRef(false)
  const prevRecCount = useRef(0)
  useEffect(() => {
    if (!notifMounted.current) {
      notifMounted.current = true
      prevRecCount.current = recordings.length
      return
    }
    if (recordings.length > prevRecCount.current) {
      const newest = recordings[0]
      if (newest && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('SENTINEL·OPS — Nueva grabación', {
          body: `${newest.cameraId.toUpperCase()} · ${newest.date} ${newest.time}`,
        })
      }
      playAlertBeep()
    }
    prevRecCount.current = recordings.length
  }, [recordings])

  const togglePlay = useCallback(() => {
    if (playing) {
      if (playRef.current) clearInterval(playRef.current)
      setPlaying(false)
    } else {
      setPlaying(true)
      setLive(false)
      playRef.current = setInterval(() => {
        setPos(p => {
          if (p >= 100) {
            if (playRef.current) clearInterval(playRef.current)
            setPlaying(false)
            setLive(true)
            return 100
          }
          return p + 0.4
        })
      }, 120)
    }
  }, [playing])

  const clickTimeline = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const p = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))
    if (playRef.current) clearInterval(playRef.current)
    setPos(p)
    setPlaying(false)
    setLive(p > 99)
  }, [])

  const seekTo = useCallback((p: number) => {
    if (playRef.current) clearInterval(playRef.current)
    setPos(p)
    setPlaying(false)
    setLive(p > 99)
  }, [])

  const handleNav = useCallback((view: string) => {
    if (view === 'rec') {
      setActiveView('rec')
      setRecTab('rec')
    } else if (view === 'alertas') {
      setActiveView('rec')
      setRecTab('alertas')
      setAlertsSeen(true)
    } else {
      setActiveView(view)
    }
  }, [])

  const handleRecTabChange = useCallback((t: RecTab) => {
    setRecTab(t)
    if (t === 'alertas') setAlertsSeen(true)
  }, [])

  const handleSaveSettings = useCallback((gb: number) => {
    setMaxStorageGB(gb)
    try { localStorage.setItem('maxStorageGB', String(gb)) } catch {}
  }, [])

  const activeRecordings = cameras.filter(c => c.recording).length
  const isLive = activeView === 'live'
  const sidebarActiveView = activeView === 'rec' ? recTab : activeView
  const alertsBadge = alertsSeen ? 0 : ALERTS.length

  const focusedCameraId = selected !== null ? cameras[selected]?.id : undefined
  const focusedRecordings = focusedCameraId
    ? recordings.filter(r => r.cameraId === focusedCameraId)
    : recordings

  const handleSelectCamera = useCallback((i: number) => {
    setSelected(prev => prev === i ? null : i)
  }, [setSelected])

  const fullscreenCam = fullscreenIdx !== null ? cameras[fullscreenIdx] : null
  const cameraRecsLabel = cameraRecsId
    ? (cameras.find(c => c.id === cameraRecsId)?.label ?? cameraRecsId)
    : ''

  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#08090A',
      color: '#ECE8E1', fontFamily: "'DM Mono', monospace",
      display: 'flex', overflow: 'hidden', position: 'relative',
    }}>
      <Sidebar activeView={sidebarActiveView} alertsBadge={alertsBadge} onNav={handleNav} onOpenSettings={() => setShowSettings(true)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header
          now={now}
          serverOk={serverOk}
          activeRecordings={activeRecordings}
          camerasMax={9}
          camerasOnline={camerasOnline}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
        />

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {isLive ? (
            <>
              <CameraGrid
                cameras={filteredCameras}
                selected={selected}
                playbackCameraId={cameraRecsId}
                now={now}
                snapshotUrl={snapshotUrl}
                onSelect={handleSelectCamera}
                onAddClick={() => setShowAddModal(true)}
                onStartRec={startRecording}
                onStopRec={stopRecording}
                onShowRecs={id => setCameraRecsId(id)}
                onRename={id => setRenamingCameraId(id)}
                onRemove={id => setConfirmRemoveId(id)}
                onFullscreen={idx => setFullscreenIdx(idx)}
              />
              <RightRail
                alerts={ALERTS}
                devices={DEVICES}
                diskPercent={diskPercent}
                recordingsSizeBytes={recordingsSizeBytes}
                maxStorageGB={maxStorageGB}
              />
            </>
          ) : (
            <RecPanel
              recordings={recordings}
              onDeleteRecording={deleteRecording}
              searchQuery={searchQuery}
              tab={recTab}
              onTabChange={handleRecTabChange}
            />
          )}
        </div>

        <Timeline
          playing={playing}
          live={live}
          pos={pos}
          recordings={focusedRecordings}
          onTogglePlay={togglePlay}
          onClickTimeline={clickTimeline}
          onSeek={seekTo}
        />
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddCameraModal
          onAdd={addCamera}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          maxStorageGB={maxStorageGB}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {fullscreenCam && (
        <FullscreenModal
          camera={fullscreenCam}
          now={now}
          snapshotUrl={snapshotUrl(fullscreenCam.id)}
          onStartRec={() => startRecording(fullscreenCam.id)}
          onStopRec={() => stopRecording(fullscreenCam.id)}
          onClose={() => setFullscreenIdx(null)}
        />
      )}

      {cameraRecsId && (
        <CameraRecsModal
          cameraId={cameraRecsId}
          cameraLabel={cameraRecsLabel}
          recordings={recordings}
          onDelete={deleteRecording}
          onClose={() => setCameraRecsId(null)}
        />
      )}

      {renamingCameraId && (() => {
        const cam = cameras.find(c => c.id === renamingCameraId)
        return cam ? (
          <RenameCameraModal
            camera={cam}
            onSave={async (label, zone) => {
              await renameCamera(cam.id, label, zone)
              setRenamingCameraId(null)
            }}
            onClose={() => setRenamingCameraId(null)}
          />
        ) : null
      })()}

      {confirmRemoveId && (() => {
        const cam = cameras.find(c => c.id === confirmRemoveId)
        return cam ? (
          <div
            onClick={() => setConfirmRemoveId(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 400,
              background: 'rgba(8,9,10,.82)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: 340, background: '#0E1012',
                border: '2px solid #5A1F1B', borderRadius: 14, overflow: 'hidden',
              }}
            >
              <div style={{ padding: '20px 20px 16px' }}>
                <div style={{ fontSize: 12, color: '#ECE8E1', letterSpacing: '.06em', marginBottom: 8 }}>
                  DAR DE BAJA: {cam.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 10, color: '#7E858C', lineHeight: 1.6 }}>
                  Se eliminará la cámara del sistema.<br />Las grabaciones existentes no se borrarán.
                </div>
              </div>
              <div style={{
                padding: '12px 20px', borderTop: '2px solid #20242A',
                display: 'flex', justifyContent: 'flex-end', gap: 8,
              }}>
                <button
                  onClick={() => setConfirmRemoveId(null)}
                  style={{
                    padding: '8px 16px', borderRadius: 9, cursor: 'pointer',
                    border: '2px solid #20242A', background: 'transparent', color: '#7E858C',
                    fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '.06em',
                  }}
                >
                  CANCELAR
                </button>
                <button
                  onClick={async () => { await removeCamera(cam.id); setConfirmRemoveId(null) }}
                  style={{
                    padding: '8px 16px', borderRadius: 9, cursor: 'pointer',
                    border: '2px solid #FF5247', background: '#1A0E0D', color: '#FF5247',
                    fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '.06em',
                  }}
                >
                  DAR DE BAJA
                </button>
              </div>
            </div>
          </div>
        ) : null
      })()}
    </div>
  )
}
