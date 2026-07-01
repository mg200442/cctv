import { useState } from 'react'
import { Network, Unplug, Circle, StopCircle, MoreVertical, Trash2, Pencil, PowerOff } from 'lucide-react'
import type { Camera, AiBox } from '@/types/camera'
import { SnapshotStream } from './SnapshotStream'

const BOX_COLOR: Record<AiBox['kind'], string> = {
  accent: '#E07820', cyan: '#38BDF8', red: '#FF5247',
}

interface Props {
  camera: Camera
  isPlayback: boolean
  now: Date
  snapshotUrl: string
  onSelect: () => void
  onFullscreen: () => void
  onStartRec: () => void
  onStopRec: () => void
  onShowRecs: () => void
  onRename: () => void
  onRemove: () => void
}

function pad(n: number) { return String(n).padStart(2, '0') }

export function CameraCard({
  camera, isPlayback, now, snapshotUrl,
  onSelect, onFullscreen, onStartRec, onStopRec, onShowRecs, onRename, onRemove,
}: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const ts = camera.offline
    ? 'SIN SENAL'
    : `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

  const showLiveStream = camera.enabled && !camera.offline

  // Border: red (recording) > orange (playback) > green (live) > dark (offline)
  const borderColor = camera.offline
    ? '#3A3F47'
    : camera.recording
    ? '#FF5247'
    : isPlayback
    ? '#E07820'
    : '#36D399'

  const glowShadow = camera.offline
    ? 'none'
    : camera.recording
    ? `0 0 14px -4px #FF5247`
    : isPlayback
    ? `0 0 18px -4px #E07820`
    : `0 0 8px -6px #36D399`

  return (
    <div
      onClick={onSelect}
      onDoubleClick={e => { e.stopPropagation(); onFullscreen() }}
      style={{
        position: 'relative', borderRadius: 10, overflow: 'hidden',
        cursor: 'pointer', background: '#0a0b0c',
        border: `2px solid ${borderColor}`,
        boxShadow: glowShadow,
        width: '100%', height: '100%',
        transition: 'border-color .2s, box-shadow .2s',
      }}
    >
      {/* Scene background */}
      <div style={{ position: 'absolute', inset: 0, background: camera.scene }} />

      {/* Live snapshot stream */}
      {showLiveStream && <SnapshotStream snapshotUrl={snapshotUrl} label={camera.label} />}

      {/* Floor grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: 'linear-gradient(to top,#000,transparent 70%)',
        WebkitMaskImage: 'linear-gradient(to top,#000,transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 70px 8px rgba(0,0,0,.7)', pointerEvents: 'none' }} />

      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(rgba(0,0,0,0) 0px,rgba(0,0,0,0) 2px,rgba(0,0,0,.18) 3px)',
        pointerEvents: 'none',
      }} />
      <div className="scan-line" style={{
        position: 'absolute', left: 0, right: 0, height: 14,
        background: 'linear-gradient(rgba(255,255,255,.06),transparent)',
        pointerEvents: 'none',
      }} />

      {/* AI boxes */}
      {camera.boxes.map((box, i) => {
        const col = BOX_COLOR[box.kind]
        return (
          <div key={i} className="ai-pulse" style={{
            position: 'absolute',
            left: box.x + '%', top: box.y + '%',
            width: box.w + '%', height: box.h + '%',
            border: `2px solid ${col}`, borderRadius: 4, pointerEvents: 'none',
          }}>
            <span style={{
              position: 'absolute', top: -16, left: -2, whiteSpace: 'nowrap',
              fontSize: 8, letterSpacing: '.06em', padding: '1px 5px',
              borderRadius: 3, background: col, color: '#08090A',
              fontFamily: "'DM Mono',monospace",
            }}>
              {box.label}
            </span>
          </div>
        )
      })}

      {/* Top overlay */}
      <div style={{
        position: 'absolute', top: 10, left: 10, right: 10,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        pointerEvents: 'none',
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '.08em', color: '#fff', textShadow: '0 1px 3px #000' }}>
            {camera.label}
          </div>
          <div style={{ fontSize: 9, letterSpacing: '.06em', color: '#C9C4BB', textShadow: '0 1px 3px #000', marginTop: 1 }}>
            {camera.zone}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', pointerEvents: 'all' }}>
          {!camera.offline && (
            <button
              onClick={e => { e.stopPropagation(); camera.recording ? onStopRec() : onStartRec() }}
              onDoubleClick={e => e.stopPropagation()}
              title={camera.recording ? 'Detener grabación' : 'Iniciar grabación'}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                background: camera.recording ? 'rgba(255,82,71,.2)' : 'rgba(8,9,10,.6)',
                border: camera.recording ? '1px solid rgba(255,82,71,.7)' : '1px solid rgba(255,82,71,.4)',
              }}
            >
              {camera.recording
                ? <StopCircle size={10} color="#FF5247" />
                : <Circle size={10} color="#FF5247" />}
              <span className={camera.recording ? 'rec-blink' : ''}
                style={{ fontSize: 8, letterSpacing: '.1em', color: '#FF8079' }}>
                {camera.recording ? 'REC ●' : 'REC'}
              </span>
            </button>
          )}
          {/* Camera menu */}
          <div
            tabIndex={-1}
            onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowMenu(false) }}
            style={{ position: 'relative' }}
            onDoubleClick={e => e.stopPropagation()}
          >
            <button
              onClick={e => { e.stopPropagation(); setShowMenu(s => !s) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: 5, cursor: 'pointer',
                background: showMenu ? 'rgba(224,120,32,.2)' : 'rgba(8,9,10,.6)',
                border: showMenu ? '1px solid rgba(224,120,32,.5)' : '1px solid rgba(255,255,255,.1)',
                color: showMenu ? '#E07820' : '#7E858C',
              }}
            >
              <MoreVertical size={11} />
            </button>

            {showMenu && (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 100,
                  background: '#0E1012', border: '2px solid #20242A', borderRadius: 10,
                  padding: '6px 0', minWidth: 160,
                  boxShadow: '0 8px 24px rgba(0,0,0,.7)',
                }}
              >
                <MenuItem icon={Trash2} label="GRABACIONES" color="#7E858C" onClick={() => { setShowMenu(false); onShowRecs() }} />
                <MenuItem icon={Pencil} label="RENOMBRAR" color="#7E858C" onClick={() => { setShowMenu(false); onRename() }} />
                <div style={{ margin: '4px 0', borderTop: '1px solid #20242A' }} />
                <MenuItem icon={PowerOff} label="DAR DE BAJA" color="#FF5247" onClick={() => { setShowMenu(false); onRemove() }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom overlay */}
      <div style={{
        position: 'absolute', bottom: 10, left: 10, right: 10,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        pointerEvents: 'none',
      }}>
        <span style={{
          fontSize: 9, letterSpacing: '.04em', color: '#C9C4BB',
          background: 'rgba(8,9,10,.6)', padding: '3px 7px',
          borderRadius: 5, textShadow: '0 1px 2px #000',
        }}>
          {ts}
        </span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(8,9,10,.6)', padding: '3px 7px', borderRadius: 5,
        }}>
          {camera.offline
            ? <Unplug size={12} color="#FF5247" />
            : <Network size={12} color="#36D399" />}
          <span style={{ fontSize: 9, color: '#C9C4BB' }}>{camera.fps ?? '—'}</span>
        </div>
      </div>
    </div>
  )
}

function MenuItem({ icon: Icon, label, color, onClick }: {
  icon: React.ElementType; label: string; color: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', border: 'none', background: 'transparent',
        color, cursor: 'pointer', fontFamily: "'DM Mono',monospace",
        fontSize: 10, letterSpacing: '.08em', textAlign: 'left',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#16191C' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      <Icon size={12} />
      {label}
    </button>
  )
}
