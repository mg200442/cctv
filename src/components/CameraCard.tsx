import { useState } from 'react'
import { Network, Unplug, Circle, StopCircle, MoreVertical, Trash2, Pencil, PowerOff, Pause, Play, Radar, Video, Camera as CameraIcon, Gauge } from 'lucide-react'
import type { Camera, AiBox, CameraStreamPresetKey, CustomStream } from '@/types/camera'
import { SnapshotStream } from './SnapshotStream'
import { StreamPresetModal } from './StreamPresetModal'
import { streamPresetLabel } from '@/shared/streamPresetLabel'

const BOX_COLOR: Record<AiBox['kind'], string> = {
  accent: '#E07820', cyan: '#38BDF8', red: '#FF5247',
}

interface Props {
  camera: Camera
  isPlayback: boolean
  isSelected?: boolean
  now: Date
  snapshotUrl: string
  motionActive: boolean
  onSelect: () => void
  onFullscreen: () => void
  onStartRec: () => void
  onStopRec: () => void
  onShowRecs: () => void
  onRename: () => void
  onRemove: () => void
  onTogglePause: () => void
  onToggleMotionEnabled: () => void
  onSetMotionAction: (action: 'record' | 'snapshot') => void
  onSetStreamPreset: (key: CameraStreamPresetKey | null, customStream?: CustomStream) => void
}

function pad(n: number) { return String(n).padStart(2, '0') }

export function CameraCard({
  camera, isPlayback, isSelected = false, now, snapshotUrl, motionActive,
  onSelect, onFullscreen, onStartRec, onStopRec, onShowRecs, onRename, onRemove, onTogglePause,
  onToggleMotionEnabled, onSetMotionAction, onSetStreamPreset,
}: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const [showStreamModal, setShowStreamModal] = useState(false)
  const motionEnabled = camera.motionEnabled !== false
  // Per-camera detection only actually runs while the GLOBAL switch (header
  // / Alertas tab) is on — a camera can be individually "enabled" and still
  // do nothing if that master switch is off. Distinguishing "armed but
  // waiting" from "actually watching" here avoids the confusing "looks like
  // it's already working" impression reported when the global toggle was off.
  const motionReallyActive = motionEnabled && motionActive
  const motionIndicatorColor = motionReallyActive ? '#38BDF8' : motionEnabled ? '#E07820' : '#3A3F47'
  const motionAction = camera.motionAction === 'snapshot' ? 'snapshot' : 'record'
  const ts = camera.offline
    ? 'SIN SENAL'
    : `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

  const showLiveStream = camera.enabled && !camera.offline

  // Border: red (recording) > orange (playback) > gray (paused) > green (live) > dark (offline)
  const borderColor = camera.offline
    ? '#3A3F47'
    : !camera.enabled
    ? '#7E858C'
    : camera.recording
    ? '#FF5247'
    : isPlayback
    ? '#E07820'
    : '#36D399'

  const glowShadow = camera.offline || !camera.enabled
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
        transition: 'border-color .2s, box-shadow .2s, outline-color .2s',
        // Focus ring — independent of status border color, so a selected
        // camera is visibly distinct even while recording/offline/etc.
        outline: isSelected ? '3px solid #38BDF8' : '3px solid transparent',
        outlineOffset: 3,
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
          {camera.motionActive && (
            <div
              title="Movimiento detectado"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 6,
                background: 'rgba(56,189,248,.2)', border: '1px solid rgba(56,189,248,.7)',
              }}
            >
              <Radar size={10} color="#38BDF8" className="live-dot" />
              <span style={{ fontSize: 8, letterSpacing: '.1em', color: '#38BDF8' }}>MOVIMIENTO</span>
            </div>
          )}
          {/* Persistent per-camera motion-detection state — shown always (not
              just when off), so it's clear at a glance which cameras are
              being watched without opening the menu. The pulsing
              "MOVIMIENTO" pill above only appears during an active
              detection event; this is the resting on/off indicator.
              Three states, not two: off (gray) / armed-but-global-off
              (amber — the per-camera switch is on but nothing is actually
              running because the header/Alertas master switch is off) /
              actually watching (cyan). Clickable — this IS the toggle now,
              replacing the equivalent "···" menu entry entirely. */}
          <button
            onClick={e => { e.stopPropagation(); onToggleMotionEnabled() }}
            onDoubleClick={e => e.stopPropagation()}
            title={
              !motionEnabled ? 'Detección de movimiento desactivada — clic para activar'
                : motionReallyActive ? 'Detección de movimiento activada — clic para desactivar'
                : 'Activada para esta cámara, pero la detección global está PAUSADA (no está vigilando ahora) — clic para desactivar'
            }
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: 6, cursor: 'pointer',
              background: motionEnabled ? `${motionIndicatorColor}26` : 'rgba(8,9,10,.6)',
              border: motionEnabled ? `1px solid ${motionIndicatorColor}80` : '1px solid rgba(255,255,255,.1)',
            }}
          >
            <Radar size={10} color={motionIndicatorColor} />
          </button>
          {/* What motion detection does when it fires — video or a still
              snapshot. Clickable to cycle the mode — replaces the equivalent
              "···" menu entry entirely. */}
          <button
            onClick={e => { e.stopPropagation(); onSetMotionAction(motionAction === 'record' ? 'snapshot' : 'record') }}
            onDoubleClick={e => e.stopPropagation()}
            title={
              (motionAction === 'record' ? 'Al detectar movimiento: graba vídeo' : 'Al detectar movimiento: guarda snapshot')
              + ' — clic para cambiar'
            }
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: 6, cursor: 'pointer',
              background: motionEnabled ? `${motionIndicatorColor}26` : 'rgba(8,9,10,.6)',
              border: motionEnabled ? `1px solid ${motionIndicatorColor}80` : '1px solid rgba(255,255,255,.1)',
            }}
          >
            {motionAction === 'record'
              ? <Video size={10} color={motionIndicatorColor} />
              : <CameraIcon size={10} color={motionIndicatorColor} />}
          </button>
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
                <MenuItem
                  icon={camera.enabled ? Pause : Play}
                  label={camera.enabled ? 'PAUSAR' : 'REANUDAR'}
                  color="#7E858C"
                  onClick={() => { setShowMenu(false); onTogglePause() }}
                />
                <div style={{ margin: '4px 0', borderTop: '1px solid #20242A' }} />
                {/* Per-camera override of the "Optimizar" preset (Timeline
                    footer) — absent camera.streamPreset means it inherits
                    whichever preset is set globally. Opens a modal instead
                    of a nested submenu — the submenu used to get clipped by
                    this card's own `overflow: hidden` (needed for the video
                    feed/scan-line effects) whenever the card sat near an
                    edge of the grid, and there wasn't room for the 4-field
                    custom form either. */}
                <MenuItem
                  icon={Gauge}
                  label={`CALIDAD: ${streamPresetLabel(camera.streamPreset)}`}
                  color="#7E858C"
                  onClick={() => { setShowMenu(false); setShowStreamModal(true) }}
                />
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

      {showStreamModal && (
        <StreamPresetModal
          camera={camera}
          onSetStreamPreset={onSetStreamPreset}
          onClose={() => setShowStreamModal(false)}
        />
      )}
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
