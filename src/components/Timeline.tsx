import { useState, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Download, FolderOpen, X, Video } from 'lucide-react'
import type { Recording } from '@/hooks/useCameras'
import { VideoPlayer } from './VideoPlayer'

const ACCENT = '#E07820'

const HOURS = Array.from({ length: 9 }, (_, i) => {
  const h = i * 3
  return { label: String(h).padStart(2, '0') + ':00', left: (h / 24 * 100) + '%' }
})

// Colors cycled per camera id
const CAM_COLORS = ['#E07820', '#38BDF8', '#36D399', '#A78BFA', '#FF5247', '#F59E0B']
function camColor(id: string, index: number) {
  const hash = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return CAM_COLORS[(hash + index) % CAM_COLORS.length]
}

const FALLBACK_DURATION_MIN = 5  // used only when real duration is unknown

function pad(n: number) { return String(n).padStart(2, '0') }

interface Props {
  playing: boolean
  live: boolean
  pos: number
  recordings: Recording[]
  onTogglePlay: () => void
  onClickTimeline: (e: React.MouseEvent<HTMLDivElement>) => void
  onSeek: (pos: number) => void
}

// % position along the 24h track for a recording's start time
function recordingPos(rec: Recording): number | null {
  if (!rec.time) return null
  const [hh, mm] = rec.time.split(':').map(Number)
  return ((hh * 60 + (mm || 0)) / 1440) * 100
}

export function Timeline({ playing, live, pos, recordings, onTogglePlay, onClickTimeline, onSeek }: Props) {
  const [showRecs, setShowRecs] = useState(false)
  const [activeRec, setActiveRec] = useState<Recording | null>(null)
  // Names already seen by the user — badge only counts recordings not yet
  // acknowledged, and clears the moment the panel is opened.
  const [seenNames, setSeenNames] = useState<Set<string>>(() => new Set())
  const unseenCount = recordings.filter(r => !seenNames.has(r.name)).length

  const toggleRecs = useCallback(() => {
    setShowRecs(s => {
      const next = !s
      if (next) setSeenNames(new Set(recordings.map(r => r.name)))
      return next
    })
  }, [recordings])

  // Jump the playhead to the previous/next recording's start (wraps around)
  const jumpToEvent = useCallback((direction: 'prev' | 'next') => {
    const positions = recordings
      .map(recordingPos)
      .filter((p): p is number => p !== null)
      .sort((a, b) => a - b)
    if (positions.length === 0) return
    if (direction === 'next') {
      const next = positions.find(p => p > pos + 0.05)
      onSeek(next ?? positions[0])
    } else {
      const prev = [...positions].reverse().find(p => p < pos - 0.05)
      onSeek(prev ?? positions[positions.length - 1])
    }
  }, [recordings, pos, onSeek])

  const totalMin = Math.round(pos / 100 * 1439)
  const headTime = pad(Math.floor(totalMin / 60)) + ':' + pad(totalMin % 60)

  // Build a deduped list of camera ids for coloring
  const camIds = [...new Set(recordings.map(r => r.cameraId))]

  const openRec = useCallback((rec: Recording) => {
    setActiveRec(rec)
    setShowRecs(false)
  }, [])

  const livePillStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '9px 14px', borderRadius: 999,
    border: live ? '2px solid #1f5a3a' : '2px solid #20242A',
    background: live ? '#0B1A14' : '#0E1012',
    color: live ? '#36D399' : '#7E858C',
    cursor: 'default',
  }

  return (
    <>
      {/* Recordings panel — slides in above footer */}
      {showRecs && (
        <div style={{
          borderTop: '2px solid #20242A', background: '#0A0C0D',
          maxHeight: 220, overflowY: 'auto',
          padding: '12px 22px', display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, letterSpacing: '.12em', color: '#7E858C' }}>
              GRABACIONES · {recordings.length} ARCHIVO{recordings.length !== 1 ? 'S' : ''}
            </span>
          </div>
          {recordings.length === 0 && (
            <p style={{ fontSize: 11, color: '#565C63', letterSpacing: '.04em', padding: '8px 0' }}>
              Sin grabaciones todavía. Pulsa REC en una cámara para grabar.
            </p>
          )}
          {recordings.map(rec => {
            const color = camColor(rec.cameraId, camIds.indexOf(rec.cameraId))
            return (
              <div
                key={rec.name}
                onClick={() => openRec(rec)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px',
                  border: `2px solid ${activeRec?.name === rec.name ? color : '#20242A'}`,
                  borderRadius: 10, cursor: 'pointer',
                  background: activeRec?.name === rec.name ? '#0E1012' : '#0A0C0D',
                  transition: 'border-color .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = activeRec?.name === rec.name ? color : '#20242A')}
              >
                <Video size={16} color={color} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#ECE8E1', letterSpacing: '.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {rec.cameraId.toUpperCase()} · {rec.date} {rec.time}
                  </div>
                  <div style={{ fontSize: 9, color: '#565C63', letterSpacing: '.08em', marginTop: 2 }}>
                    {rec.name}
                  </div>
                </div>
                <Play size={12} color="#7E858C" />
              </div>
            )
          })}
        </div>
      )}

      <footer style={{
        height: 104, flexShrink: 0, borderTop: '2px solid #20242A',
        background: '#0C0E10', padding: '12px 22px',
        display: 'flex', alignItems: 'center', gap: 22,
      }}>
        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onTogglePlay}
            style={{
              width: 44, height: 44, borderRadius: 12,
              border: `2px solid ${ACCENT}`, background: '#1A130A', color: ACCENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <div style={{ display: 'flex', gap: 6 }}>
            {([['prev', SkipBack], ['next', SkipForward]] as const).map(([dir, Icon]) => (
              <button
                key={dir}
                onClick={() => jumpToEvent(dir)}
                disabled={recordings.length === 0}
                title={dir === 'prev' ? 'Evento anterior' : 'Evento siguiente'}
                style={{
                  width: 34, height: 34, borderRadius: 9,
                  border: '2px solid #20242A', background: '#0E1012',
                  color: recordings.length === 0 ? '#3A3F47' : '#C9C4BB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: recordings.length === 0 ? 'default' : 'pointer',
                }}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>

          <div style={livePillStyle}>
            <span className={live ? 'live-dot' : ''} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: live ? '#36D399' : ACCENT,
            }} />
            <span style={{ fontSize: 10, letterSpacing: '.1em' }}>
              {live ? 'EN DIRECTO' : 'REPRODUCIENDO'}
            </span>
          </div>
        </div>

        {/* Track */}
        <div
          onClick={onClickTimeline}
          style={{
            flex: 1, height: 60, border: '2px solid #20242A', borderRadius: 12,
            background: '#0A0C0D', position: 'relative', cursor: 'pointer', overflow: 'hidden',
          }}
        >
          {/* Hour markers */}
          {HOURS.map(h => (
            <div key={h.label}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, width: 1, background: '#1A1D20', left: h.left }} />
              <span style={{ position: 'absolute', bottom: 4, fontSize: 8, color: '#565C63', transform: 'translateX(-50%)', left: h.left }}>
                {h.label}
              </span>
            </div>
          ))}

          {/* Recording segments — colored by camera, width ≈ estimated duration */}
          {recordings.map((rec, i) => {
            const leftPct = recordingPos(rec)
            if (leftPct === null) return null
            const durationMin = rec.duration ? rec.duration / 60 : FALLBACK_DURATION_MIN
            const widthPct = (durationMin / 1440) * 100
            const color = camColor(rec.cameraId, camIds.indexOf(rec.cameraId))
            const isActive = activeRec?.name === rec.name
            return (
              <div
                key={i}
                onClick={e => { e.stopPropagation(); setActiveRec(isActive ? null : rec); setShowRecs(false) }}
                title={`${rec.cameraId.toUpperCase()} · ${rec.date} ${rec.time}`}
                style={{
                  position: 'absolute', top: 6, height: 26,
                  // Short recordings (a few seconds) would otherwise round
                  // down to an almost-invisible sliver on a 24h-wide track.
                  borderRadius: 3, left: leftPct + '%',
                  width: `max(10px, ${widthPct}%)`,
                  border: `1px solid ${color}`,
                  background: color,
                  opacity: isActive ? 1 : 0.55,
                  cursor: 'pointer', zIndex: 2,
                  boxShadow: isActive ? `0 0 8px ${color}` : 'none',
                  transition: 'opacity .15s, box-shadow .15s',
                }}
              />
            )
          })}

          {/* Coverage bar */}
          <div style={{
            position: 'absolute', left: 0, top: 36, height: 4, width: '100%',
            background: 'linear-gradient(90deg, #1c2024, #2A2E33)', borderRadius: 2,
          }} />

          {/* Playhead */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: 2,
            background: ACCENT, left: pos + '%',
            boxShadow: `0 0 10px ${ACCENT}`,
          }}>
            <div style={{
              position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
              width: 11, height: 11, background: '#ECE8E1',
              border: '2px solid #08090A', borderRadius: 3,
            }} />
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 14,
            color: '#ECE8E1', letterSpacing: '.04em', width: 64, textAlign: 'right',
          }}>
            {headTime}
          </div>

          <button
            onClick={toggleRecs}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 13px', borderRadius: 10, cursor: 'pointer',
              border: showRecs ? '2px solid #E07820' : '2px solid #20242A',
              background: showRecs ? '#1A130A' : '#0E1012',
              color: showRecs ? '#E07820' : '#C9C4BB',
              fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '.04em',
            }}
          >
            <FolderOpen size={14} />
            GRABACIONES
            {unseenCount > 0 && (
              <span style={{
                minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
                background: '#FF5247', color: '#fff', fontSize: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                letterSpacing: 0,
              }}>
                {unseenCount}
              </span>
            )}
          </button>

          <TimelineBtn icon={Download} label="EXPORTAR" />
        </div>
      </footer>

      {/* Video player modal */}
      {activeRec && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(8,9,10,.92)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setActiveRec(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '80vw', maxWidth: 960, background: '#0E1012',
              border: '2px solid #20242A', borderRadius: 16, overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px', borderBottom: '2px solid #20242A',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Video size={16} color={camColor(activeRec.cameraId, camIds.indexOf(activeRec.cameraId))} />
                <span style={{ fontSize: 12, color: '#ECE8E1', letterSpacing: '.06em' }}>
                  {activeRec.cameraId.toUpperCase()} · {activeRec.date} {activeRec.time}
                </span>
              </div>
              <button
                onClick={() => setActiveRec(null)}
                style={{
                  width: 28, height: 28, border: '2px solid #20242A', borderRadius: 8,
                  background: 'transparent', color: '#7E858C',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            </div>

            <VideoPlayer url={activeRec.url} maxHeight="72vh" />

            <div style={{
              padding: '10px 18px', borderTop: '2px solid #20242A',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 9, color: '#565C63', letterSpacing: '.08em' }}>{activeRec.name}</span>
              <a
                href={activeRec.url}
                download={activeRec.name}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8,
                  border: '2px solid #20242A', background: '#0C0E10',
                  color: '#C9C4BB', fontSize: 10, letterSpacing: '.08em',
                  textDecoration: 'none',
                }}
              >
                <Download size={12} /> DESCARGAR
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TimelineBtn({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <button style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '9px 13px', border: '2px solid #20242A', borderRadius: 10,
      background: '#0E1012', color: '#C9C4BB',
      fontFamily: "'DM Mono', monospace", fontSize: 11,
      letterSpacing: '.04em', cursor: 'pointer',
    }}>
      <Icon size={14} />
      {label}
    </button>
  )
}
