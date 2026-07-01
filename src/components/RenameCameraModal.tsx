import { useState, useEffect, useRef } from 'react'
import { X, Check } from 'lucide-react'
import type { Camera } from '@/types/camera'

interface Props {
  camera: Camera
  onSave: (label: string, zone: string) => Promise<void>
  onClose: () => void
}

export function RenameCameraModal({ camera, onSave, onClose }: Props) {
  const [label, setLabel] = useState(camera.label)
  const [zone, setZone] = useState(camera.zone)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])

  async function handleSave() {
    if (!label.trim()) return
    setSaving(true)
    try { await onSave(label.trim(), zone.trim()) } finally { setSaving(false) }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(8,9,10,.82)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 380, background: '#0E1012',
          border: '2px solid #20242A', borderRadius: 14, overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '2px solid #20242A',
        }}>
          <span style={{ fontSize: 11, letterSpacing: '.1em', color: '#ECE8E1' }}>
            RENOMBRAR CÁMARA
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
        <div style={{ padding: '18px 18px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 9, letterSpacing: '.12em', color: '#7E858C' }}>NOMBRE</label>
            <input
              ref={inputRef}
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={handleKey}
              style={{
                padding: '10px 12px', border: '2px solid #20242A', borderRadius: 9,
                background: '#0C0E10', color: '#ECE8E1',
                fontFamily: "'DM Mono', monospace", fontSize: 13, outline: 'none',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#E07820' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#20242A' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 9, letterSpacing: '.12em', color: '#7E858C' }}>ZONA</label>
            <input
              value={zone}
              onChange={e => setZone(e.target.value)}
              onKeyDown={handleKey}
              style={{
                padding: '10px 12px', border: '2px solid #20242A', borderRadius: 9,
                background: '#0C0E10', color: '#ECE8E1',
                fontFamily: "'DM Mono', monospace", fontSize: 13, outline: 'none',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#E07820' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#20242A' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px', borderTop: '2px solid #20242A',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 9, cursor: 'pointer',
            border: '2px solid #20242A', background: 'transparent', color: '#7E858C',
            fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '.06em',
          }}>
            CANCELAR
          </button>
          <button onClick={handleSave} disabled={saving || !label.trim()} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 9, cursor: 'pointer',
            border: '2px solid #E07820', background: '#1A130A', color: '#E07820',
            fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '.06em',
            opacity: saving || !label.trim() ? 0.5 : 1,
          }}>
            <Check size={12} /> {saving ? 'GUARDANDO…' : 'GUARDAR'}
          </button>
        </div>
      </div>
    </div>
  )
}
