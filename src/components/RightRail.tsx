import { useState, useEffect } from 'react'
import {
  User, Car, TriangleAlert, HardDrive,
  UserRound, ShieldAlert, Radar, DoorOpen, VideoOff,
  ChevronRight, ChevronLeft, Video, Camera as CameraIcon, X,
} from 'lucide-react'
import type { Alert, Camera, Detection } from '@/types/camera'
import { useLayoutMode } from '@/hooks/useLayoutMode'

const VEHICLE_CLASSES = ['car', 'truck', 'bus', 'motorcycle', 'bicycle']

// Filenames are `${cameraId}_${timestamp}.ext` — same parsing as everywhere
// else that reads a recording/snapshot name.
function fileDate(name: string): string {
  return name.replace(/\.(mp4|jpg)$/, '').split('_')[1]?.split('T')[0] ?? ''
}

function todayCounts(results: Detection[]) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const todays = results.filter(r => fileDate(r.name) === today)
  const persons = todays.filter(r => r.classes.some(c => c.class === 'person')).length
  const vehicles = todays.filter(r => r.classes.some(c => VEHICLE_CLASSES.includes(c.class))).length
  return { persons, vehicles }
}

const ALERTS_PAGE_SIZE = 30

function pad2(n: number) { return String(n).padStart(2, '0') }
function dayKey(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }

// Groups alerts into day buckets by scanning them in existing order rather
// than re-sorting — the array is already newest-first (server does
// `alerts.unshift`, see server.js), so consecutive same-day runs are
// already contiguous; this just finds the boundaries.
function dayLabel(ts: string): string {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const key = dayKey(d)
  if (key === dayKey(now)) return 'HOY'
  if (key === dayKey(yesterday)) return 'AYER'
  return key
}

const ICON_MAP: Record<string, React.ElementType> = {
  'user-round': UserRound,
  'shield-alert': ShieldAlert,
  'radar': Radar,
  'car': Car,
  'door-open': DoorOpen,
  'video-off': VideoOff,
}

const TONE_MAP = {
  red:   { color: '#FF5247', bg: '#1A0E0D' },
  amber: { color: '#E07820', bg: '#1A130A' },
  cyan:  { color: '#38BDF8', bg: '#0B1620' },
  green: { color: '#36D399', bg: '#0B1A14' },
}

interface Props {
  alerts: Alert[]
  cameras: Camera[]
  diskPercent: number
  recordingsSizeBytes: number
  maxStorageGB: number
  detectionResults: Detection[]
  onViewRecording: (alert: Alert) => void
  onViewSnapshot: (alert: Alert) => void
}

export function RightRail({
  alerts, cameras, diskPercent, recordingsSizeBytes, maxStorageGB, detectionResults, onViewRecording, onViewSnapshot,
}: Props) {
  const layoutMode = useLayoutMode()
  const isMobile = layoutMode === 'mobile'
  // Tablet starts collapsed by default (still a one-tap toggle away) — the
  // fixed 360px panel eats proportionally more of a tablet's width than a
  // laptop's. Desktop keeps its original always-expanded default. This is
  // only the INITIAL value — resizing the window later doesn't force it
  // shut again, same as the grid-column preference elsewhere in the app.
  const [collapsed, setCollapsed] = useState(() => layoutMode === 'tablet')
  // Mobile doesn't have room for this panel at all inline — it's a
  // full-screen overlay opened from a floating button instead (see below).
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cameraFilter, setCameraFilter] = useState('all')
  const [visibleCount, setVisibleCount] = useState(ALERTS_PAGE_SIZE)
  // Changing the filter starts back at page 1 — otherwise switching from
  // "todas" (scrolled deep via "cargar más") to a single camera could leave
  // visibleCount far larger than that camera's own alert count for no reason.
  useEffect(() => { setVisibleCount(ALERTS_PAGE_SIZE) }, [cameraFilter])

  const { persons: personsToday, vehicles: vehiclesToday } = todayCounts(detectionResults)
  // "live" reflects whether the camera is actually delivering fresh frames
  // right now (server-checked) — not just whether it hasn't been paused.
  const liveCount = cameras.filter(c => c.enabled && c.live).length
  const noSignalCount = cameras.filter(c => c.enabled && !c.live).length
  const pausedCount = cameras.filter(c => !c.enabled).length

  const filteredAlerts = cameraFilter === 'all' ? alerts : alerts.filter(a => a.cameraId === cameraFilter)
  const visibleAlerts = filteredAlerts.slice(0, visibleCount)
  let lastDayShown = ''

  const storagePercent = maxStorageGB > 0
    ? Math.round((recordingsSizeBytes / (maxStorageGB * 1024 * 1024 * 1024)) * 100)
    : diskPercent
  const diskColor = storagePercent >= 95 ? '#FF5247' : storagePercent >= 80 ? '#E07820' : '#36D399'
  const diskSubLabel = storagePercent >= 95 ? 'CRÍTICO' : storagePercent >= 80 ? 'AVISO' : undefined

  // Everything below the collapse/close button — identical content whether
  // it's sitting in the desktop/tablet inline panel or the mobile
  // full-screen overlay, so it's built once here instead of duplicated.
  const panelBody = (
    <>
      {/* KPI grid */}
      <div style={{ padding: '6px 16px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <KpiCard icon={User} label="PERSONAS HOY" value={String(personsToday)} color="#E07820" />
        <KpiCard icon={Car} label="VEHICULOS HOY" value={String(vehiclesToday)} color="#38BDF8" />
        <KpiCard icon={TriangleAlert} label="ALERTAS" value={String(alerts.length)} color="#FF5247" />
        <KpiCard
          icon={HardDrive}
          label={`ALMACEN /${maxStorageGB}GB`}
          color={diskColor}
          value={
            storagePercent > 0
              ? <>{storagePercent}<span style={{ fontSize: 18, color: '#7E858C' }}>%</span></>
              : <>—</>
          }
          subLabel={diskSubLabel}
        />
      </div>

      {/* Alerts header */}
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, letterSpacing: '.14em', color: '#ECE8E1' }}>ALERTAS EN VIVO</span>
        {/* Was a static "ULTIMAS 24H" label that didn't actually filter
            anything — now a real per-camera filter. The list itself isn't
            time-windowed either (it's whatever the server keeps in
            alerts.json); day headers below at least make the timeframe of
            what you're looking at obvious while scrolling. */}
        <select
          value={cameraFilter}
          onChange={e => setCameraFilter(e.target.value)}
          style={{
            fontSize: 9, letterSpacing: '.06em', color: '#7E858C',
            background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer',
            fontFamily: "'DM Mono',monospace", textAlign: 'right', maxWidth: 140,
          }}
        >
          <option value="all">TODAS LAS CÁMARAS</option>
          {cameras.map(c => <option key={c.id} value={c.id}>{c.label.toUpperCase()}</option>)}
        </select>
      </div>

      {/* Alert list */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '0 16px',
        display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0,
      }}>
        {filteredAlerts.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 10, color: '#565C63', letterSpacing: '.06em' }}>
            Sin alertas{cameraFilter !== 'all' ? ' para esta cámara' : ''}.
          </div>
        )}
        {visibleAlerts.map((al, i) => {
          const { color, bg } = TONE_MAP[al.tone]
          const Icon = ICON_MAP[al.icon] ?? Radar
          const hasPreview = !!(al.recording || al.snapshot)
          const openPreview = () => {
            if (al.snapshot) onViewSnapshot(al)
            else if (al.recording) onViewRecording(al)
          }
          const label = dayLabel(al.ts)
          const showDayHeader = label !== lastDayShown
          lastDayShown = label
          return (
            <div key={al.id}>
              {showDayHeader && (
                <div style={{
                  fontSize: 9, letterSpacing: '.14em', color: '#565C63',
                  padding: i === 0 ? '0 0 2px' : '10px 0 2px',
                }}>
                  {label}
                </div>
              )}
            <div
              onClick={hasPreview ? openPreview : undefined}
              title={hasPreview ? (al.snapshot ? 'Ver snapshot de esta alerta' : 'Ver grabación de esta alerta') : undefined}
              style={{
                display: 'flex', gap: 11, padding: 11,
                border: '2px solid #20242A', borderRadius: 10,
                background: '#0E1012', alignItems: 'center',
                cursor: hasPreview ? 'pointer' : 'default',
                transition: 'border-color .15s, background .15s',
              }}
              onMouseEnter={e => { if (hasPreview) { e.currentTarget.style.borderColor = '#3A3F47'; e.currentTarget.style.background = '#111417' } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#20242A'; e.currentTarget.style.background = '#0E1012' }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${color}`, color, background: bg,
              }}>
                <Icon size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#ECE8E1', letterSpacing: '.02em' }}>{al.type}</div>
                <div style={{ fontSize: 9, color: '#7E858C', marginTop: 2, letterSpacing: '.04em' }}>
                  {al.cam} · {al.zone}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: '#C9C4BB' }}>{al.time}</div>
                <div style={{ fontSize: 8, letterSpacing: '.1em', color, marginTop: 3 }}>{al.sev}</div>
              </div>
              {/* Just an indicator now — the whole row is the click target */}
              {al.recording && (
                <div
                  title="Grabación disponible"
                  style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    border: '1px solid #20242A', background: '#0A0C0D', color: '#C9C4BB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Video size={12} />
                </div>
              )}
              {al.snapshot && (
                <div
                  title="Snapshot disponible"
                  style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    border: '1px solid #20242A', background: '#0A0C0D', color: '#C9C4BB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <CameraIcon size={12} />
                </div>
              )}
            </div>
            </div>
          )
        })}
        {filteredAlerts.length > visibleAlerts.length && (
          <button
            onClick={() => setVisibleCount(v => v + ALERTS_PAGE_SIZE)}
            style={{
              padding: '9px 0', borderRadius: 9, cursor: 'pointer',
              border: '1px dashed #20242A', background: 'transparent', color: '#7E858C',
              fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '.08em',
            }}
          >
            CARGAR MÁS ({filteredAlerts.length - visibleAlerts.length})
          </button>
        )}
      </div>

      {/* Device status */}
      <div style={{ borderTop: '2px solid #20242A', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 10, letterSpacing: '.14em', color: '#ECE8E1' }}>ESTADO DE EQUIPO DIRECTO</span>
          <span style={{
            fontSize: 9, letterSpacing: '.08em',
            color: noSignalCount > 0 ? '#FF5247' : pausedCount > 0 ? '#7E858C' : '#36D399',
          }}>
            {liveCount} EN VIVO
            {noSignalCount > 0 && ` · ${noSignalCount} SIN SEÑAL`}
            {pausedCount > 0 && ` · ${pausedCount} PAUSADA${pausedCount !== 1 ? 'S' : ''}`}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {cameras.length === 0 && (
            <span style={{ fontSize: 10, color: '#565C63' }}>Sin cámaras configuradas.</span>
          )}
          {cameras.map((cam) => {
            // Three real states: paused by the operator, enabled but not
            // actually delivering frames (network/camera down), or genuinely live.
            const status = !cam.enabled ? 'paused' : cam.live ? 'live' : 'noSignal'
            const dot = status === 'live' ? '#36D399' : status === 'noSignal' ? '#FF5247' : '#7E858C'
            const label = status === 'live' ? 'EN VIVO' : status === 'noSignal' ? 'SIN SEÑAL' : 'PAUSADA'
            return (
              <div key={cam.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  className={status === 'live' ? 'live-dot' : ''}
                  style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }}
                />
                <span style={{
                  fontSize: 10, color: '#C9C4BB', maxWidth: 80, flexShrink: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{cam.label}</span>
                <span style={{
                  fontSize: 10, color: '#7E858C', flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{cam.zone}</span>
                <span style={{ fontSize: 9, letterSpacing: '.06em', color: dot }}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )

  if (isMobile) {
    const totalBadge = alerts.length + (noSignalCount > 0 ? 1 : 0)
    if (!mobileOpen) {
      // Floating action button — sits above the bottom tab bar (Sidebar.tsx
      // on mobile), badge count is alerts + a nod to "something needs
      // attention" when a camera has no signal.
      return (
        <button
          onClick={() => setMobileOpen(true)}
          title="Alertas y estado"
          style={{
            position: 'fixed', right: 16, bottom: 'calc(64px + max(10px, env(safe-area-inset-bottom)))',
            width: 52, height: 52, borderRadius: '50%', zIndex: 120,
            border: `2px solid ${totalBadge > 0 ? '#E07820' : '#20242A'}`,
            background: '#0E1012', color: totalBadge > 0 ? '#E07820' : '#7E858C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,.5)',
          }}
        >
          <TriangleAlert size={20} />
          {totalBadge > 0 && (
            <span style={{
              position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, padding: '0 4px',
              borderRadius: 9, background: '#FF5247', color: '#fff',
              fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #08090A',
            }}>
              {totalBadge}
            </span>
          )}
        </button>
      )
    }
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 250,
        background: '#0C0E10', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 0' }}>
          <span style={{ fontSize: 11, letterSpacing: '.1em', color: '#ECE8E1' }}>ALERTAS Y ESTADO</span>
          <button
            onClick={() => setMobileOpen(false)}
            title="Cerrar"
            style={{
              width: 30, height: 30, borderRadius: 8, border: '1px solid #20242A',
              background: 'transparent', color: '#7E858C', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>
        {panelBody}
      </div>
    )
  }

  // Collapsed: only show a thin strip with the toggle
  if (collapsed) {
    return (
      <aside style={{
        width: 32, flexShrink: 0, borderLeft: '2px solid #20242A',
        background: '#0C0E10', display: 'flex', flexDirection: 'column',
        alignItems: 'center', paddingTop: 14,
      }}>
        <button
          onClick={() => setCollapsed(false)}
          title="Expandir panel"
          style={{
            width: 24, height: 24, borderRadius: 6, border: '1px solid #20242A',
            background: 'transparent', color: '#565C63', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronLeft size={14} />
        </button>
        {/* Vertical label */}
        <span style={{
          marginTop: 16, fontSize: 8, letterSpacing: '.14em', color: '#3A3F47',
          writingMode: 'vertical-rl', textOrientation: 'mixed',
        }}>
          ALERTAS
        </span>
        {diskColor !== '#36D399' && (
          <span style={{
            marginTop: 12, width: 8, height: 8, borderRadius: '50%', background: diskColor,
            flexShrink: 0,
          }} />
        )}
      </aside>
    )
  }

  return (
    <aside style={{
      width: 360, flexShrink: 0, borderLeft: '2px solid #20242A',
      background: '#0C0E10', display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      {/* Collapse button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 12px 0' }}>
        <button
          onClick={() => setCollapsed(true)}
          title="Colapsar panel"
          style={{
            width: 24, height: 24, borderRadius: 6, border: '1px solid #20242A',
            background: 'transparent', color: '#565C63', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {panelBody}
    </aside>
  )
}

function KpiCard({
  icon: Icon, label, value, color, subLabel,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  color: string
  subLabel?: string
}) {
  return (
    <div style={{
      border: '2px solid #20242A', borderRadius: 12,
      padding: '12px 14px', background: '#0E1012',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7E858C' }}>
        <Icon size={13} />
        <span style={{ fontSize: 9, letterSpacing: '.1em' }}>{label}</span>
      </div>
      <div style={{
        fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: 40,
        lineHeight: 1, marginTop: 4, color,
      }}>
        {value}
      </div>
      {subLabel && (
        <div style={{ fontSize: 8, letterSpacing: '.12em', color, marginTop: 2 }}>{subLabel}</div>
      )}
    </div>
  )
}
