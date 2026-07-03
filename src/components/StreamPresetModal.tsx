import { useState } from 'react'
import { X, Check } from 'lucide-react'
import type { Camera, CameraStreamPresetKey, CustomStream } from '@/types/camera'
import streamPresets from '@/shared/streamPresets.json'

// streamPresets.json's "default" field is just a plain string at the type
// level (JSON has no way to express "one of these object keys") — cast once
// so indexing .presets with it doesn't need a cast at every call site.
const DEFAULT_PRESET_KEY = streamPresets.default as keyof typeof streamPresets.presets

// Widely-recognized resolutions instead of free-typed width/height — picking
// an arbitrary pixel size is easy to get wrong (odd aspect ratio, a value
// ffmpeg's scale filter chokes on) and doesn't mean anything to most users.
// 2304×1296 is the Zosi ZG2323M's own native resolution (see CLAUDE.md) —
// included so "no downscaling at all" is a selectable option, not just
// something you'd have to know to type in by hand.
const RESOLUTIONS = [
  { key: '640x360', label: '640×360', width: 640, height: 360 },
  { key: '960x540', label: '960×540', width: 960, height: 540 },
  { key: '1280x720', label: '1280×720 (HD)', width: 1280, height: 720 },
  { key: '1600x900', label: '1600×900', width: 1600, height: 900 },
  { key: '1920x1080', label: '1920×1080 (Full HD)', width: 1920, height: 1080 },
  { key: '2304x1296', label: '2304×1296 (nativa de la cámara)', width: 2304, height: 1296 },
  { key: '2560x1440', label: '2560×1440 (QHD)', width: 2560, height: 1440 },
  { key: '3840x2160', label: '3840×2160 (4K)', width: 3840, height: 2160 },
] as const

const FPS_OPTIONS = [5, 7, 10, 12, 15, 20, 25, 30] as const

// Raw ffmpeg -q:v numbers (1 best – 31 worst) mean nothing on their own —
// paired with a "mejor/peor" hint instead of a bare number picker. Values
// deliberately overlap the 4 fixed presets' own q (10/8/5/3) plus one step
// further at each end, so the range feels continuous with them.
const QUALITY_OPTIONS = [
  { value: 2, label: '2 — máxima calidad' },
  { value: 3, label: '3' },
  { value: 5, label: '5' },
  { value: 8, label: '8' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 22, label: '22 — mínima calidad' },
] as const

function nearestOf(options: readonly number[], value: number): number {
  return options.reduce((best, opt) => Math.abs(opt - value) < Math.abs(best - value) ? opt : best)
}

interface Props {
  camera: Camera
  onSetStreamPreset: (key: CameraStreamPresetKey | null, customStream?: CustomStream) => void
  onClose: () => void
}

// Was a nested submenu off CameraCard's "···" menu — got clipped by the
// card's own `overflow: hidden` (needed elsewhere for the video feed/scan
// line effects) whenever a card sat near the bottom/edge of the grid, and
// there wasn't room for the 4-field custom form either. A centered modal
// (same pattern as RenameCameraModal) has no such constraint.
export function StreamPresetModal({ camera, onSetStreamPreset, onClose }: Props) {
  const initial = camera.customStream ?? streamPresets.presets[DEFAULT_PRESET_KEY]
  // Prefills to the closest recognized option — matters if a camera already
  // has customStream values saved from before this UI only offered curated
  // choices (an exact match just selects that same option).
  const initialResKey = RESOLUTIONS.find(r => r.width === initial.width && r.height === initial.height)?.key ?? '1280x720'
  const [resolutionKey, setResolutionKey] = useState<string>(initialResKey)
  const [fps, setFps] = useState(nearestOf(FPS_OPTIONS, initial.fps))
  const [q, setQ] = useState(nearestOf(QUALITY_OPTIONS.map(o => o.value), initial.q))

  function pick(key: CameraStreamPresetKey | null) {
    onSetStreamPreset(key)
    onClose()
  }
  function applyCustom() {
    const res = RESOLUTIONS.find(r => r.key === resolutionKey)!
    onSetStreamPreset('custom', { width: res.width, height: res.height, fps, q })
    onClose()
  }

  return (
    <div
      // This modal renders as a DOM descendant of CameraCard's root
      // clickable div (onSelect) rather than at the app root like the other
      // modals — stopPropagation here so dismissing it doesn't also select
      // the camera underneath.
      onClick={e => { e.stopPropagation(); onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(8,9,10,.82)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 400, maxHeight: '85vh', overflowY: 'auto',
          background: '#0E1012', border: '2px solid #20242A', borderRadius: 14,
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '2px solid #20242A',
          position: 'sticky', top: 0, background: '#0E1012',
        }}>
          <span style={{ fontSize: 11, letterSpacing: '.1em', color: '#ECE8E1' }}>
            CALIDAD DE VÍDEO — {camera.label.toUpperCase()}
          </span>
          <button onClick={onClose} style={{
            width: 26, height: 26, border: '1px solid #20242A', borderRadius: 7,
            background: 'transparent', color: '#7E858C',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 9, letterSpacing: '.12em', color: '#7E858C' }}>PRESETS</span>
            <PresetRow
              label="USAR GLOBAL"
              detail="Hereda el preset del botón OPTIMIZAR"
              active={!camera.streamPreset}
              onClick={() => pick(null)}
            />
            {Object.entries(streamPresets.presets).map(([key, p]) => (
              <PresetRow
                key={key}
                label={p.label}
                detail={`${p.width}×${p.height} · ${p.fps}fps`}
                active={camera.streamPreset === key}
                onClick={() => pick(key as CameraStreamPresetKey)}
              />
            ))}
          </div>

          <div style={{ borderTop: '1px solid #20242A' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 9, letterSpacing: '.12em', color: '#7E858C' }}>
              PERSONALIZADO{camera.streamPreset === 'custom' && <span style={{ color: '#E07820' }}> · ACTIVO</span>}
            </span>
            <SelectField
              label="RESOLUCIÓN"
              value={resolutionKey}
              onChange={setResolutionKey}
              options={RESOLUTIONS.map(r => ({ value: r.key, label: r.label }))}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <SelectField
                label="FPS"
                value={String(fps)}
                onChange={v => setFps(Number(v))}
                options={FPS_OPTIONS.map(f => ({ value: String(f), label: String(f) }))}
              />
              <SelectField
                label="CALIDAD"
                value={String(q)}
                onChange={v => setQ(Number(v))}
                options={QUALITY_OPTIONS.map(o => ({ value: String(o.value), label: o.label }))}
              />
            </div>
            <button
              onClick={applyCustom}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px 14px', borderRadius: 9, cursor: 'pointer',
                border: '2px solid #E07820', background: '#1A130A', color: '#E07820',
                fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '.06em',
              }}
            >
              <Check size={12} /> APLICAR PERSONALIZADO
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PresetRow({ label, detail, active, onClick }: {
  label: string; detail: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'left',
        padding: '8px 12px', borderRadius: 9, cursor: 'pointer',
        border: '2px solid ' + (active ? '#E07820' : '#20242A'),
        background: active ? '#1A130A' : 'transparent',
        fontFamily: "'DM Mono',monospace",
      }}
    >
      <span style={{ fontSize: 10, letterSpacing: '.06em', color: active ? '#E07820' : '#ECE8E1' }}>
        {active ? '● ' : ''}{label}
      </span>
      <span style={{ fontSize: 9, letterSpacing: '.04em', color: '#565C63' }}>{detail}</span>
    </button>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 8, letterSpacing: '.08em', color: '#565C63' }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '7px 9px', borderRadius: 6, boxSizing: 'border-box',
          border: '2px solid #20242A', background: '#0C0E10', color: '#ECE8E1',
          fontFamily: "'DM Mono',monospace", fontSize: 11, outline: 'none', cursor: 'pointer',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#E07820' }}
        onBlur={e => { e.currentTarget.style.borderColor = '#20242A' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}
