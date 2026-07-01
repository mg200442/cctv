import { useEffect } from 'react'
import { X, Circle, StopCircle, Network, Unplug } from 'lucide-react'
import type { Camera, AiBox } from '@/types/camera'
import { SnapshotStream } from './SnapshotStream'

const ACCENT = '#E07820'
const BOX_COLOR: Record<AiBox['kind'], string> = {
  accent: ACCENT, cyan: '#38BDF8', red: '#FF5247',
}

function pad(n: number) { return String(n).padStart(2, '0') }

interface Props {
  camera: Camera
  now: Date
  snapshotUrl: string
  onStartRec: () => void
  onStopRec: () => void
  onClose: () => void
}

export function FullscreenModal({ camera, now, snapshotUrl, onStartRec, onStopRec, onClose }: Props) {
  const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(8,9,10,.96)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: '90vw', height: '90vh',
          borderRadius: 14, overflow: 'hidden',
          border: `2px solid ${ACCENT}`,
          boxShadow: `0 0 60px -10px ${ACCENT}44`,
          background: '#0a0b0c',
        }}
      >
        {/* Scene background */}
        <div style={{ position: 'absolute', inset: 0, background: camera.scene }} />

        {/* Live stream */}
        {camera.enabled && !camera.offline && (
          <SnapshotStream snapshotUrl={snapshotUrl} label={camera.label} />
        )}

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(to top,#000,transparent 70%)',
          WebkitMaskImage: 'linear-gradient(to top,#000,transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Vignette */}
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 120px 20px rgba(0,0,0,.7)', pointerEvents: 'none' }} />

        {/* Scanlines */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(rgba(0,0,0,0) 0px,rgba(0,0,0,0) 2px,rgba(0,0,0,.18) 3px)',
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
                position: 'absolute', top: -20, left: -2, whiteSpace: 'nowrap',
                fontSize: 10, letterSpacing: '.06em', padding: '2px 7px',
                borderRadius: 3, background: col, color: '#08090A',
                fontFamily: "'DM Mono',monospace",
              }}>
                {box.label}
              </span>
            </div>
          )
        })}

        {/* Top controls */}
        <div style={{
          position: 'absolute', top: 16, left: 16, right: 16,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div style={{ background: 'rgba(8,9,10,.72)', borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(4px)' }}>
            <div style={{ fontSize: 15, letterSpacing: '.08em', color: '#fff' }}>{camera.label}</div>
            <div style={{ fontSize: 10, letterSpacing: '.06em', color: '#C9C4BB', marginTop: 2 }}>{camera.zone}</div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {!camera.offline && (
              <button
                onClick={() => camera.recording ? onStopRec() : onStartRec()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                  background: camera.recording ? 'rgba(255,82,71,.2)' : 'rgba(8,9,10,.72)',
                  border: camera.recording ? '1px solid rgba(255,82,71,.7)' : '1px solid rgba(255,82,71,.4)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                {camera.recording
                  ? <StopCircle size={13} color="#FF5247" />
                  : <Circle size={13} color="#FF5247" />}
                <span className={camera.recording ? 'rec-blink' : ''}
                  style={{ fontSize: 10, letterSpacing: '.1em', color: '#FF8079', fontFamily: "'DM Mono',monospace" }}>
                  {camera.recording ? 'REC ●' : 'REC'}
                </span>
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: 36, height: 36, borderRadius: 9, cursor: 'pointer',
                background: 'rgba(8,9,10,.72)', border: '1px solid rgba(255,255,255,.15)',
                color: '#ECE8E1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Bottom status */}
        <div style={{
          position: 'absolute', bottom: 16, left: 16, right: 16,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          pointerEvents: 'none',
        }}>
          <span style={{
            fontSize: 11, letterSpacing: '.04em', color: '#C9C4BB',
            background: 'rgba(8,9,10,.72)', padding: '5px 10px',
            borderRadius: 7, backdropFilter: 'blur(4px)',
          }}>
            {camera.offline ? 'SIN SENAL' : ts}
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(8,9,10,.72)', padding: '5px 10px',
            borderRadius: 7, backdropFilter: 'blur(4px)',
          }}>
            {camera.offline
              ? <Unplug size={13} color="#FF5247" />
              : <Network size={13} color="#36D399" />}
            <span style={{ fontSize: 10, color: '#C9C4BB' }}>{camera.fps ?? '—'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
