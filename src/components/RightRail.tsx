import { useState } from 'react'
import {
  User, Car, TriangleAlert, HardDrive,
  UserRound, ShieldAlert, Radar, DoorOpen, VideoOff,
  ChevronRight, ChevronLeft, Video,
} from 'lucide-react'
import type { Alert, Camera } from '@/types/camera'

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
  onViewRecording: (alert: Alert) => void
}

export function RightRail({ alerts, cameras, diskPercent, recordingsSizeBytes, maxStorageGB, onViewRecording }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  // "live" reflects whether the camera is actually delivering fresh frames
  // right now (server-checked) — not just whether it hasn't been paused.
  const liveCount = cameras.filter(c => c.enabled && c.live).length
  const noSignalCount = cameras.filter(c => c.enabled && !c.live).length
  const pausedCount = cameras.filter(c => !c.enabled).length

  const storagePercent = maxStorageGB > 0
    ? Math.round((recordingsSizeBytes / (maxStorageGB * 1024 * 1024 * 1024)) * 100)
    : diskPercent
  const diskColor = storagePercent >= 95 ? '#FF5247' : storagePercent >= 80 ? '#E07820' : '#36D399'
  const diskSubLabel = storagePercent >= 95 ? 'CRÍTICO' : storagePercent >= 80 ? 'AVISO' : undefined

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

      {/* KPI grid */}
      <div style={{ padding: '6px 16px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <KpiCard icon={User} label="PERSONAS HOY" value="247" color="#E07820" />
        <KpiCard icon={Car} label="VEHICULOS" value="38" color="#38BDF8" />
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
        <span style={{ fontSize: 9, letterSpacing: '.08em', color: '#7E858C' }}>ULTIMAS 24H</span>
      </div>

      {/* Alert list */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '0 16px',
        display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0,
      }}>
        {alerts.map((al, i) => {
          const { color, bg } = TONE_MAP[al.tone]
          const Icon = ICON_MAP[al.icon] ?? Radar
          return (
            <div key={i} style={{
              display: 'flex', gap: 11, padding: 11,
              border: '2px solid #20242A', borderRadius: 10,
              background: '#0E1012', alignItems: 'center',
            }}>
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
              {al.recording && (
                <button
                  onClick={() => onViewRecording(al)}
                  title="Ver grabación de esta alerta"
                  style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0, cursor: 'pointer',
                    border: '1px solid #20242A', background: '#0E1012', color: '#C9C4BB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Video size={12} />
                </button>
              )}
            </div>
          )
        })}
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
