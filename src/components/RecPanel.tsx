import { useState } from 'react'
import {
  Clapperboard, Bell, Activity, Video, Download, Trash2, Play, Pause,
  X, Car, UserRound, ShieldAlert, Radar, DoorOpen, VideoOff, Search,
} from 'lucide-react'
import type { Recording } from '@/hooks/useCameras'
import { ALERTS } from '@/data/cameras'
import { VideoPlayer } from './VideoPlayer'

export type Tab = 'rec' | 'alertas' | 'movimiento'

function fmtDuration(s: number) {
  if (!s) return null
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`
  if (m > 0) return `${m}m ${String(sec).padStart(2,'0')}s`
  return `${sec}s`
}

function fmtSize(b: number) {
  if (!b) return null
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

interface Props {
  recordings: Recording[]
  onDeleteRecording: (name: string) => Promise<void>
  searchQuery?: string
  tab: Tab
  visibleTabs: Tab[]
  onTabChange: (tab: Tab) => void
}

const TONE_MAP = {
  red:   { color: '#FF5247', bg: '#1A0E0D' },
  amber: { color: '#E07820', bg: '#1A130A' },
  cyan:  { color: '#38BDF8', bg: '#0B1620' },
  green: { color: '#36D399', bg: '#0B1A14' },
}

const ICON_MAP: Record<string, React.ElementType> = {
  'user-round': UserRound, 'shield-alert': ShieldAlert, 'radar': Radar,
  'car': Car, 'door-open': DoorOpen, 'video-off': VideoOff,
}

const SEV_ORDER: Record<string, number> = { ALTA: 0, MEDIA: 1, BAJA: 2, INFO: 3 }

export function RecPanel({ recordings, onDeleteRecording, searchQuery = '', tab, visibleTabs, onTabChange }: Props) {
  const [activeRec, setActiveRec] = useState<Recording | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const q = searchQuery.trim().toLowerCase()
  const visibleRecs = q
    ? recordings.filter(r =>
        r.cameraId.includes(q) || r.date.includes(q) || r.time.includes(q)
      )
    : recordings

  // Group recordings by camera
  const byCamera = visibleRecs.reduce<Record<string, Recording[]>>((acc, rec) => {
    if (!acc[rec.cameraId]) acc[rec.cameraId] = []
    acc[rec.cameraId].push(rec)
    return acc
  }, {})

  const motionAlerts = ALERTS.filter(a =>
    a.type.toLowerCase().includes('movimiento') || a.type.toLowerCase().includes('perimetro') || a.type.toLowerCase().includes('persona')
  )

  const sortedAlerts = [...ALERTS].sort((a, b) => (SEV_ORDER[a.sev] ?? 4) - (SEV_ORDER[b.sev] ?? 4))

  async function handleDelete(name: string) {
    setDeleting(name)
    try {
      await onDeleteRecording(name)
      if (activeRec?.name === name) setActiveRec(null)
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  const TABS: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'rec', label: 'GRABACIONES', icon: Clapperboard, count: recordings.length },
    { key: 'alertas', label: 'ALERTAS', icon: Bell, count: ALERTS.length },
    { key: 'movimiento', label: 'MOVIMIENTO', icon: Activity, count: motionAlerts.length },
  ].filter(t => visibleTabs.includes(t.key))

  return (
    <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Tab bar — only shown when there's more than one section to switch between */}
      {TABS.length > 1 && (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '14px 20px', borderBottom: '2px solid #20242A',
        background: '#0C0E10', flexShrink: 0,
      }}>
        {TABS.map(({ key, label, icon: Icon, count }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                border: active ? '2px solid #E07820' : '2px solid #20242A',
                background: active ? '#1A130A' : 'transparent',
                color: active ? '#E07820' : '#7E858C',
                fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '.08em',
              }}
            >
              <Icon size={13} />
              {label}
              {count !== undefined && count > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
                  background: active ? '#E07820' : '#20242A',
                  color: active ? '#08090A' : '#7E858C',
                  fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  letterSpacing: 0,
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* ── GRABACIONES ── */}
        {tab === 'rec' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {q && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                fontSize: 10, color: '#7E858C', letterSpacing: '.06em', marginBottom: 4,
              }}>
                <Search size={12} />
                {visibleRecs.length} resultado{visibleRecs.length !== 1 ? 's' : ''} para «{q}»
              </div>
            )}

            {recordings.length === 0 && (
              <div style={{
                padding: '48px 0', textAlign: 'center',
                fontSize: 12, color: '#565C63', letterSpacing: '.06em',
              }}>
                Sin grabaciones todavía.<br />
                <span style={{ fontSize: 10, marginTop: 6, display: 'block', color: '#3A3F47' }}>
                  Pulsa REC en una cámara para empezar a grabar.
                </span>
              </div>
            )}

            {recordings.length > 0 && visibleRecs.length === 0 && (
              <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 11, color: '#565C63' }}>
                Sin grabaciones que coincidan con «{q}».
              </div>
            )}

            {/* Video player panel */}
            {activeRec && (
              <div style={{
                border: '2px solid #E07820', borderRadius: 12, overflow: 'hidden',
                background: '#000', marginBottom: 8,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', background: '#0E1012', borderBottom: '1px solid #20242A',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Video size={13} color="#E07820" />
                    <span style={{ fontSize: 11, color: '#ECE8E1', letterSpacing: '.04em' }}>
                      {activeRec.cameraId.toUpperCase()} · {activeRec.date} {activeRec.time}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <a
                      href={activeRec.url}
                      download={activeRec.name}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 10px', borderRadius: 7,
                        border: '1px solid #20242A', background: '#0A0C0D',
                        color: '#C9C4BB', fontSize: 9, letterSpacing: '.08em',
                        textDecoration: 'none',
                      }}
                    >
                      <Download size={10} /> DESCARGAR
                    </a>
                    <button
                      onClick={() => setActiveRec(null)}
                      style={{
                        width: 26, height: 26, border: '1px solid #20242A', borderRadius: 7,
                        background: 'transparent', color: '#7E858C',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
                <VideoPlayer url={activeRec.url} maxHeight={340} />
              </div>
            )}

            {/* Per-camera groups */}
            {Object.entries(byCamera).map(([camId, recs]) => (
              <div key={camId}>
                {/* Camera header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 9, letterSpacing: '.12em', padding: '3px 8px',
                      borderRadius: 5, background: '#20242A', color: '#E07820',
                    }}>
                      {camId.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 10, color: '#7E858C', letterSpacing: '.04em' }}>
                      {recs.length} archivo{recs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Recording rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {recs.map(rec => {
                    const isActive = activeRec?.name === rec.name
                    const isConfirm = confirmDelete === rec.name
                    const isDel = deleting === rec.name
                    return (
                      <div
                        key={rec.name}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', borderRadius: 10,
                          border: `2px solid ${isActive ? '#E07820' : '#20242A'}`,
                          background: isActive ? '#1A130A' : '#0A0C0D',
                          transition: 'border-color .15s',
                        }}
                      >
                        <Video size={14} color={isActive ? '#E07820' : '#7E858C'} style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: '#ECE8E1', letterSpacing: '.04em' }}>
                            {rec.date} · {rec.time}
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                            {fmtDuration(rec.duration) && (
                              <span style={{ fontSize: 9, color: '#E07820', letterSpacing: '.04em' }}>
                                {fmtDuration(rec.duration)}
                              </span>
                            )}
                            {fmtSize(rec.size) && (
                              <span style={{ fontSize: 9, color: '#565C63', letterSpacing: '.04em' }}>
                                {fmtSize(rec.size)}
                              </span>
                            )}
                            {!fmtDuration(rec.duration) && !fmtSize(rec.size) && (
                              <span style={{ fontSize: 9, color: '#3A3F47', letterSpacing: '.04em' }}>
                                {rec.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => setActiveRec(isActive ? null : rec)}
                            title={isActive ? 'Cerrar' : 'Reproducir'}
                            style={{
                              width: 28, height: 28, borderRadius: 7, cursor: 'pointer',
                              border: `1px solid ${isActive ? '#E07820' : '#20242A'}`,
                              background: isActive ? '#1A130A' : '#0E1012',
                              color: isActive ? '#E07820' : '#C9C4BB',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            {isActive ? <Pause size={11} /> : <Play size={11} />}
                          </button>
                          <a
                            href={rec.url}
                            download={rec.name}
                            style={{
                              width: 28, height: 28, borderRadius: 7,
                              border: '1px solid #20242A', background: '#0E1012',
                              color: '#C9C4BB', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', textDecoration: 'none',
                            }}
                          >
                            <Download size={11} />
                          </a>
                          {isConfirm ? (
                            <button
                              onClick={() => handleDelete(rec.name)}
                              disabled={isDel}
                              style={{
                                padding: '0 10px', height: 28, borderRadius: 7, cursor: 'pointer',
                                border: '1px solid #FF5247', background: '#1A0E0D',
                                color: '#FF5247', fontSize: 9, letterSpacing: '.08em',
                                fontFamily: "'DM Mono',monospace",
                              }}
                            >
                              {isDel ? '…' : 'BORRAR'}
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(rec.name)}
                              onMouseLeave={() => { if (confirmDelete === rec.name) setConfirmDelete(null) }}
                              title="Eliminar"
                              style={{
                                width: 28, height: 28, borderRadius: 7, cursor: 'pointer',
                                border: '1px solid #20242A', background: '#0E1012',
                                color: '#7E858C', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ALERTAS ── */}
        {tab === 'alertas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 9, letterSpacing: '.12em', color: '#7E858C', marginBottom: 6 }}>
              ÚLTIMAS 24H · {ALERTS.length} EVENTOS
            </div>
            {sortedAlerts.map((al, i) => {
              const { color, bg } = TONE_MAP[al.tone]
              const Icon = ICON_MAP[al.icon] ?? Radar
              return (
                <div key={i} style={{
                  display: 'flex', gap: 12, padding: '12px 14px',
                  border: '2px solid #20242A', borderRadius: 10, background: '#0A0C0D',
                  alignItems: 'center',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${color}`, color, background: bg,
                  }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#ECE8E1', letterSpacing: '.02em' }}>{al.type}</div>
                    <div style={{ fontSize: 9, color: '#7E858C', marginTop: 2, letterSpacing: '.04em' }}>
                      {al.cam} · {al.zone}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#C9C4BB' }}>{al.time}</div>
                    <div style={{
                      fontSize: 8, letterSpacing: '.1em', color, marginTop: 3,
                      padding: '2px 6px', borderRadius: 4, background: bg,
                      border: `1px solid ${color}44`,
                    }}>
                      {al.sev}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── MOVIMIENTO ── */}
        {tab === 'movimiento' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 9, letterSpacing: '.12em', color: '#7E858C', marginBottom: 6 }}>
              DETECCIÓN DE MOVIMIENTO · {motionAlerts.length} EVENTOS
            </div>
            {motionAlerts.map((al, i) => {
              const { color, bg } = TONE_MAP[al.tone]
              const Icon = ICON_MAP[al.icon] ?? Activity
              return (
                <div key={i} style={{
                  display: 'flex', gap: 12, padding: '12px 14px',
                  border: '2px solid #20242A', borderRadius: 10, background: '#0A0C0D',
                  alignItems: 'center',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${color}`, color, background: bg,
                  }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#ECE8E1' }}>{al.type}</div>
                    <div style={{ fontSize: 9, color: '#7E858C', marginTop: 2, letterSpacing: '.04em' }}>
                      {al.cam} · {al.zone}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#C9C4BB' }}>{al.time}</div>
                    <div style={{ fontSize: 8, letterSpacing: '.1em', color, marginTop: 3 }}>{al.sev}</div>
                  </div>
                </div>
              )
            })}
            {motionAlerts.length === 0 && (
              <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 11, color: '#565C63' }}>
                Sin eventos de movimiento detectados.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
