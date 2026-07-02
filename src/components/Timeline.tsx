import { useState, useCallback, useMemo } from 'react'
import { Play, SkipBack, SkipForward, Download, X, Video, Radar, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Recording } from '@/hooks/useCameras'
import type { Alert } from '@/types/camera'
import { VideoPlayer } from './VideoPlayer'

const ACCENT = '#E07820'

// The visible track is a moving window, not a fixed 24h day: the right edge
// always sits `FUTURE_HOURS` ahead of the real clock (nothing can be
// recorded in the future — this is just breathing room so the playhead
// isn't glued to the edge), and covers `WINDOW_HOURS` total, so the rest is
// look-back. The ◀ ▶ controls pan that window an hour at a time; "AHORA"
// snaps back to following the real clock.
const WINDOW_HOURS = 6
const FUTURE_HOURS = 1
const HOUR_MS = 3600_000

// Colors cycled per camera id
const CAM_COLORS = ['#E07820', '#38BDF8', '#36D399', '#A78BFA', '#FF5247', '#F59E0B']
function camColor(id: string, index: number) {
  const hash = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return CAM_COLORS[(hash + index) % CAM_COLORS.length]
}

const FALLBACK_DURATION_SEC = 5 * 60  // used only when real duration is unknown

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtHM(d: Date) { return pad(d.getHours()) + ':' + pad(d.getMinutes()) }

interface Props {
  now: Date
  recordings: Recording[]
  alerts: Alert[]
  recording: boolean
}

// Absolute epoch ms for a recording/alert — using the full date (not just
// time-of-day) so events from different days never collide on the track.
function recordingTime(rec: Recording): number | null {
  if (!rec.date || !rec.time) return null
  const t = new Date(`${rec.date}T${rec.time}`).getTime()
  return Number.isNaN(t) ? null : t
}
function alertTime(alert: Alert): number | null {
  if (!alert.ts) return null
  const t = new Date(alert.ts).getTime()
  return Number.isNaN(t) ? null : t
}

export function Timeline({ now, recordings, alerts, recording }: Props) {
  const [activeRec, setActiveRec] = useState<Recording | null>(null)
  // The event (recording) the prev/next buttons last landed on — lets the
  // main Play button open it directly instead of the generic play/scrub
  // animation, and lets us show what kind of event it is. Every event here
  // is a "GRABACIÓN" today — there's no snapshot/motion-detection event data
  // in the app yet to distinguish, but the label is written generically so
  // it's ready to show those kinds once that data exists.
  const [focusedEvent, setFocusedEvent] = useState<Recording | null>(null)
  // Where the user last clicked on empty track space — a purely cosmetic
  // "you're looking at this moment" marker, independent of panning.
  const [scrubTime, setScrubTime] = useState<number | null>(null)

  // --- Moving time window ---
  const liveEdge = now.getTime() + FUTURE_HOURS * HOUR_MS
  const [manualWindowEnd, setManualWindowEnd] = useState<number | null>(null)
  const isLive = manualWindowEnd === null
  const windowEnd = manualWindowEnd ?? liveEdge
  const windowStart = windowEnd - WINDOW_HOURS * HOUR_MS

  const posForTime = useCallback(
    (t: number) => ((t - windowStart) / (windowEnd - windowStart)) * 100,
    [windowStart, windowEnd]
  )

  const panHours = useCallback((h: number) => {
    setManualWindowEnd(prev => {
      const next = (prev ?? liveEdge) + h * HOUR_MS
      return next >= liveEdge ? null : next // panning forward past the live edge just snaps back to live
    })
  }, [liveEdge])

  const goLive = useCallback(() => setManualWindowEnd(null), [])

  // Jump the playhead to the previous/next recording's start (wraps around),
  // panning the window so the found event is actually visible.
  const jumpToEvent = useCallback((direction: 'prev' | 'next') => {
    const sorted = recordings
      .map(rec => ({ rec, t: recordingTime(rec) }))
      .filter((x): x is { rec: Recording; t: number } => x.t !== null)
      .sort((a, b) => a.t - b.t)
    if (sorted.length === 0) return
    const refTime = focusedEvent ? (recordingTime(focusedEvent) ?? now.getTime()) : now.getTime()
    const found = direction === 'next'
      ? (sorted.find(x => x.t > refTime + 1000) ?? sorted[0])
      : ([...sorted].reverse().find(x => x.t < refTime - 1000) ?? sorted[sorted.length - 1])
    setFocusedEvent(found.rec)
    setScrubTime(null)
    // Place the event a bit left of the right edge, not squished at the border.
    const desiredEnd = found.t + WINDOW_HOURS * 0.3 * HOUR_MS
    setManualWindowEnd(desiredEnd >= liveEdge ? null : desiredEnd)
  }, [recordings, focusedEvent, now, liveEdge])

  const handleClickTimeline = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    setFocusedEvent(null) // manual scrub — no longer sitting on a specific event
    setScrubTime(windowStart + frac * (windowEnd - windowStart))
  }, [windowStart, windowEnd])

  // Build a deduped list of camera ids for coloring
  const camIds = [...new Set(recordings.map(r => r.cameraId))]

  // Priority: recording (red, real signal) > focused event (shows what
  // you're actually looking at) > manual scrub (paused on empty track
  // space) > live (green, following the real clock) > neutral.
  const playheadTime = focusedEvent
    ? recordingTime(focusedEvent)
    : scrubTime !== null
      ? scrubTime
      : isLive ? now.getTime() : null
  const playheadPct = playheadTime !== null ? posForTime(playheadTime) : null

  const pill = recording
    ? { label: 'GRABANDO', color: '#FF5247', border: '#5A1F1B', bg: '#1A0E0D' }
    : focusedEvent
      ? {
          label: `GRABACIÓN · ${focusedEvent.cameraId.toUpperCase()} · ${focusedEvent.time}`,
          color: camColor(focusedEvent.cameraId, camIds.indexOf(focusedEvent.cameraId)),
          border: '#20242A', bg: '#0E1012',
        }
      : (scrubTime === null && isLive)
        ? { label: 'EN DIRECTO', color: '#36D399', border: '#1f5a3a', bg: '#0B1A14' }
        : { label: 'PAUSADO', color: '#7E858C', border: '#20242A', bg: '#0E1012' }

  const livePillStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '9px 14px', borderRadius: 999,
    border: `2px solid ${pill.border}`,
    background: pill.bg,
    color: pill.color,
    cursor: 'default',
  }

  const headTime = fmtHM(new Date(playheadTime ?? now.getTime()))

  // Hour tick marks across the current window
  const hourTicks = useMemo(() => {
    const ticks: { label: string; pct: number }[] = []
    const first = new Date(windowStart)
    first.setMinutes(0, 0, 0)
    let t = first.getTime()
    if (t < windowStart) t += HOUR_MS
    for (; t <= windowEnd; t += HOUR_MS) {
      ticks.push({ label: fmtHM(new Date(t)), pct: posForTime(t) })
    }
    return ticks
  }, [windowStart, windowEnd, posForTime])

  return (
    <>
      <footer style={{
        height: 104, flexShrink: 0, borderTop: '2px solid #20242A',
        background: '#0C0E10', padding: '12px 22px',
        display: 'flex', alignItems: 'center', gap: 22,
      }}>
        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => focusedEvent && setActiveRec(focusedEvent)}
            disabled={!focusedEvent}
            title={focusedEvent ? 'Ver evento' : 'Selecciona un evento con ◀ ▶ para reproducirlo'}
            style={{
              width: 44, height: 44, borderRadius: 12,
              border: `2px solid ${focusedEvent ? ACCENT : '#20242A'}`,
              background: focusedEvent ? '#1A130A' : '#0E1012',
              color: focusedEvent ? ACCENT : '#3A3F47',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: focusedEvent ? 'pointer' : 'default',
            }}
          >
            <Play size={20} />
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
            <span className={pill.label === 'PAUSADO' ? '' : 'live-dot'} style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: pill.color,
            }} />
            <span style={{ fontSize: 10, letterSpacing: '.1em', whiteSpace: 'nowrap' }}>
              {pill.label}
            </span>
          </div>
        </div>

        {/* Hour-pan control — back */}
        <button
          onClick={() => panHours(-1)}
          title="Retroceder 1 hora"
          style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0, cursor: 'pointer',
            border: '2px solid #20242A', background: '#0E1012', color: '#C9C4BB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronLeft size={16} />
        </button>

        {/* Track */}
        <div
          onClick={handleClickTimeline}
          style={{
            flex: 1, height: 60, border: '2px solid #20242A', borderRadius: 12,
            background: '#0A0C0D', position: 'relative', cursor: 'pointer', overflow: 'hidden',
          }}
        >
          {/* Hour markers */}
          {hourTicks.map(h => (
            <div key={h.label + h.pct}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, width: 1, background: '#1A1D20', left: h.pct + '%' }} />
              <span style={{ position: 'absolute', bottom: 4, fontSize: 8, color: '#565C63', transform: 'translateX(-50%)', left: h.pct + '%' }}>
                {h.label}
              </span>
            </div>
          ))}

          {/* Recording segments — colored by camera, width ≈ estimated duration */}
          {recordings.map((rec, i) => {
            const t = recordingTime(rec)
            if (t === null) return null
            const leftPct = posForTime(t)
            if (leftPct < -5 || leftPct > 105) return null // well outside the visible window
            const durationSec = rec.duration || FALLBACK_DURATION_SEC
            const widthPct = (durationSec / 3600 / WINDOW_HOURS) * 100
            const color = camColor(rec.cameraId, camIds.indexOf(rec.cameraId))
            const isActive = activeRec?.name === rec.name
            return (
              <div
                key={i}
                onClick={e => {
                  e.stopPropagation()
                  setActiveRec(isActive ? null : rec)
                  setFocusedEvent(isActive ? null : rec)
                  setScrubTime(null)
                }}
                title={`${rec.cameraId.toUpperCase()} · ${rec.date} ${rec.time}`}
                style={{
                  position: 'absolute', top: 6, height: 26,
                  // Short recordings (a few seconds) would otherwise round
                  // down to an almost-invisible sliver on the track.
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

          {/* Motion alert markers — separate from recording segments, since a
              camera can alert without necessarily leaving a long recording */}
          {alerts.map((al, i) => {
            const t = alertTime(al)
            if (t === null) return null
            const leftPct = posForTime(t)
            if (leftPct < -5 || leftPct > 105) return null
            return (
              <div
                key={al.id ?? i}
                title={`${al.type} · ${al.cam} · ${al.zone} · ${al.time}`}
                style={{
                  position: 'absolute', top: 34, left: `calc(${leftPct}% - 5px)`,
                  width: 10, height: 10, zIndex: 3, pointerEvents: 'none',
                }}
              >
                <Radar size={10} color="#38BDF8" />
              </div>
            )
          })}

          {/* Coverage bar */}
          <div style={{
            position: 'absolute', left: 0, top: 36, height: 4, width: '100%',
            background: 'linear-gradient(90deg, #1c2024, #2A2E33)', borderRadius: 2,
          }} />

          {/* Playhead */}
          {playheadPct !== null && playheadPct >= 0 && playheadPct <= 100 && (
            <div style={{
              position: 'absolute', top: 0, bottom: 0, width: 2,
              background: ACCENT, left: playheadPct + '%',
              boxShadow: `0 0 10px ${ACCENT}`,
            }}>
              <div style={{
                position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
                width: 11, height: 11, background: '#ECE8E1',
                border: '2px solid #08090A', borderRadius: 3,
              }} />
            </div>
          )}
        </div>

        {/* Hour-pan control — forward (disabled once you're back at live) */}
        <button
          onClick={() => panHours(1)}
          disabled={isLive}
          title="Avanzar 1 hora"
          style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            border: '2px solid #20242A', background: '#0E1012',
            color: isLive ? '#3A3F47' : '#C9C4BB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: isLive ? 'default' : 'pointer',
          }}
        >
          <ChevronRight size={16} />
        </button>

        {!isLive && (
          <button
            onClick={goLive}
            title="Volver a la hora actual"
            style={{
              padding: '7px 12px', borderRadius: 8, flexShrink: 0, cursor: 'pointer',
              border: '2px solid #E07820', background: '#1A130A', color: '#E07820',
              fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '.06em',
            }}
          >
            AHORA
          </button>
        )}

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 14,
            color: '#ECE8E1', letterSpacing: '.04em', width: 64, textAlign: 'right',
          }}>
            {headTime}
          </div>

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
