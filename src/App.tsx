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

function loadAlertsSeen(): boolean {
  try { return localStorage.getItem('alertsSeen') === '1' } catch { return false }
}

// Persist which recordings the user has already acknowledged (Sidebar REC
// badge), so it doesn't reset back to "everything unseen" on every reload.
// Used to live in Timeline.tsx alongside its own GRABACIONES button/panel —
// moved here when that button was removed in favor of just the REC nav item.
const SEEN_REC_NAMES_KEY = 'seenRecordingNames'
function loadSeenRecNames(): Set<string> {
  try {
    const v = localStorage.getItem(SEEN_REC_NAMES_KEY)
    if (v) return new Set(JSON.parse(v))
  } catch {}
  return new Set()
}
function saveSeenRecNames(names: Set<string>) {
  try { localStorage.setItem(SEEN_REC_NAMES_KEY, JSON.stringify([...names])) } catch {}
}

function loadMaxStorageGB(): number {
  try {
    const v = localStorage.getItem('maxStorageGB')
    if (v) { const n = parseFloat(v); if (n > 0) return n }
  } catch {}
  return DEFAULT_MAX_STORAGE_GB
}

function loadSoundEnabled(): boolean {
  try {
    const v = localStorage.getItem('alertSoundEnabled')
    if (v !== null) return v === '1'
  } catch {}
  return true // default on, matches previous unconditional-beep behavior
}

export default function App() {
  const [now, setNow] = useState(new Date())
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Navigation & overlay state
  const [activeView, setActiveView] = useState<string>('live')
  const [recTab, setRecTab] = useState<RecTab>('rec')
  const [alertsSeen, setAlertsSeen] = useState<boolean>(loadAlertsSeen)
  const [seenRecNames, setSeenRecNames] = useState<Set<string>>(loadSeenRecNames)
  const [fullscreenIdx, setFullscreenIdx] = useState<number | null>(null)
  const [cameraRecsId, setCameraRecsId] = useState<string | null>(null)
  const [cameraRecsInitialName, setCameraRecsInitialName] = useState<string | undefined>(undefined)

  const [searchQuery, setSearchQuery] = useState('')
  const [maxStorageGB, setMaxStorageGB] = useState<number>(loadMaxStorageGB)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(loadSoundEnabled)
  const [renamingCameraId, setRenamingCameraId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const {
    cameras, selected, setSelected, serverOk, recordings, diskPercent,
    recordingsSizeBytes, addCamera, renameCamera, removeCamera, toggleCameraEnabled, toggleCameraMotion,
    startRecording, stopRecording, snapshotUrl, deleteRecording, deleteAllRecordings,
    alerts, motionActive, startMotion, stopMotion,
    networkOk, repairingNetwork, repairNetwork,
  } = useCameras()

  const toggleMotion = useCallback(() => {
    if (motionActive) stopMotion(); else startMotion()
  }, [motionActive, startMotion, stopMotion])

  const filteredCameras = searchQuery.trim()
    ? cameras.filter(c =>
        c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.zone.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : cameras

  // "online" = actually enabled AND delivering live frames right now — the
  // old `!c.offline` check used a field that's only ever set on fake demo
  // scene data, so it always counted every real camera as online regardless
  // of pause state (reported as a desync between this badge and reality).
  const camerasOnline = cameras.filter(c => c.enabled && c.live).length

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
      if (soundEnabled) playAlertBeep()
    }
    prevRecCount.current = recordings.length
  }, [recordings, soundEnabled])

  // Alert notifications when motion detection generates a new alert
  const alertNotifMounted = useRef(false)
  const prevAlertCount = useRef(0)
  useEffect(() => {
    if (!alertNotifMounted.current) {
      alertNotifMounted.current = true
      prevAlertCount.current = alerts.length
      return
    }
    if (alerts.length > prevAlertCount.current) {
      const newest = alerts[0]
      if (newest && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('SENTINEL·OPS — Movimiento detectado', {
          body: `${newest.cam} · ${newest.zone} · ${newest.time}`,
        })
      }
      if (soundEnabled) playAlertBeep()
    }
    prevAlertCount.current = alerts.length
  }, [alerts, soundEnabled])

  const markAlertsSeen = useCallback(() => {
    setAlertsSeen(true)
    try { localStorage.setItem('alertsSeen', '1') } catch {}
  }, [])

  const markRecordingsSeen = useCallback(() => {
    const all = new Set(recordings.map(r => r.name))
    setSeenRecNames(all)
    saveSeenRecNames(all)
  }, [recordings])

  const handleNav = useCallback((view: string) => {
    if (view === 'rec') {
      setActiveView('rec')
      setRecTab('rec')
      markRecordingsSeen()
    } else if (view === 'alertas') {
      setActiveView('rec')
      setRecTab('alertas')
      markAlertsSeen()
    } else {
      setActiveView(view)
    }
  }, [markAlertsSeen, markRecordingsSeen])

  const handleRecTabChange = useCallback((t: RecTab) => {
    setRecTab(t)
    if (t === 'alertas') markAlertsSeen()
  }, [markAlertsSeen])

  const handleSaveSettings = useCallback((gb: number) => {
    setMaxStorageGB(gb)
    try { localStorage.setItem('maxStorageGB', String(gb)) } catch {}
  }, [])

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev
      try { localStorage.setItem('alertSoundEnabled', next ? '1' : '0') } catch {}
      return next
    })
  }, [])

  const activeRecordings = cameras.filter(c => c.recording).length
  const isLive = activeView === 'live'
  const sidebarActiveView = activeView === 'rec' ? recTab : activeView
  const alertsBadge = alertsSeen ? 0 : alerts.length
  const recBadge = recordings.filter(r => !seenRecNames.has(r.name)).length

  const focusedCameraId = selected !== null ? cameras[selected]?.id : undefined
  const focusedRecordings = focusedCameraId
    ? recordings.filter(r => r.cameraId === focusedCameraId)
    : recordings
  const focusedAlerts = focusedCameraId
    ? alerts.filter(a => a.cameraId === focusedCameraId)
    : alerts

  const handleSelectCamera = useCallback((i: number) => {
    setSelected(prev => prev === i ? null : i)
  }, [setSelected])

  const allCamerasPaused = cameras.length > 0 && cameras.every(c => !c.enabled)

  // If everything is already paused, the button resumes all; otherwise
  // (all active, or a mix) it pauses whatever's still on.
  const toggleAllPaused = useCallback(() => {
    const newEnabled = allCamerasPaused
    cameras.forEach(c => { if (c.enabled !== newEnabled) toggleCameraEnabled(c.id, newEnabled) })
  }, [cameras, allCamerasPaused, toggleCameraEnabled])

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
      <Sidebar activeView={sidebarActiveView} alertsBadge={alertsBadge} recBadge={recBadge} onNav={handleNav} onOpenSettings={() => setShowSettings(true)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header
          now={now}
          serverOk={serverOk}
          activeRecordings={activeRecordings}
          camerasMax={9}
          camerasOnline={camerasOnline}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          allPaused={allCamerasPaused}
          onToggleAllPaused={toggleAllPaused}
          networkOk={networkOk}
          repairingNetwork={repairingNetwork}
          onRepairNetwork={repairNetwork}
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
                onShowRecs={id => { setCameraRecsId(id); setCameraRecsInitialName(undefined) }}
                onRename={id => setRenamingCameraId(id)}
                onRemove={id => setConfirmRemoveId(id)}
                onFullscreen={idx => setFullscreenIdx(idx)}
                onTogglePause={id => {
                  const cam = cameras.find(c => c.id === id)
                  if (cam) toggleCameraEnabled(id, !cam.enabled)
                }}
                onToggleMotionEnabled={id => {
                  const cam = cameras.find(c => c.id === id)
                  if (cam) toggleCameraMotion(id, cam.motionEnabled === false)
                }}
              />
              <RightRail
                alerts={alerts}
                cameras={cameras}
                diskPercent={diskPercent}
                recordingsSizeBytes={recordingsSizeBytes}
                maxStorageGB={maxStorageGB}
                onViewRecording={alert => {
                  if (!alert.recording) return
                  setCameraRecsId(alert.cameraId)
                  setCameraRecsInitialName(alert.recording)
                }}
              />
            </>
          ) : (
            <RecPanel
              recordings={recordings}
              alerts={alerts}
              onDeleteRecording={deleteRecording}
              onDeleteAllRecordings={deleteAllRecordings}
              searchQuery={searchQuery}
              tab={recTab}
              visibleTabs={recTab === 'rec' ? ['rec'] : ['alertas', 'movimiento']}
              onTabChange={handleRecTabChange}
              motionActive={motionActive}
              onToggleMotion={toggleMotion}
            />
          )}
        </div>

        <Timeline
          now={now}
          recordings={focusedRecordings}
          alerts={focusedAlerts}
          recording={activeRecordings > 0}
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
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
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
          initialRecordingName={cameraRecsInitialName}
          onDelete={deleteRecording}
          onClose={() => { setCameraRecsId(null); setCameraRecsInitialName(undefined) }}
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
