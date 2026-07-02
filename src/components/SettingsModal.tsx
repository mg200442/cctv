import { useState } from 'react'
import { X, HardDrive, Save, Volume2, VolumeX } from 'lucide-react'

interface Props {
  maxStorageGB: number
  onSave: (gb: number) => void
  soundEnabled: boolean
  onToggleSound: () => void
  onClose: () => void
}

export function SettingsModal({ maxStorageGB, onSave, soundEnabled, onToggleSound, onClose }: Props) {
  const [value, setValue] = useState(String(maxStorageGB))

  function handleSave() {
    const parsed = parseFloat(value)
    if (!isNaN(parsed) && parsed > 0) {
      onSave(parsed)
      onClose()
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(8,9,10,.88)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 420, background: '#0E1012',
          border: '2px solid #20242A', borderRadius: 16, overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '2px solid #20242A',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: '#1A130A',
              border: '2px solid #E07820', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#E07820',
            }}>
              <HardDrive size={14} />
            </div>
            <span style={{ fontSize: 13, letterSpacing: '.1em', color: '#ECE8E1' }}>CONFIGURACIÓN</span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, border: '2px solid #20242A', borderRadius: 8,
              background: 'transparent', color: '#7E858C',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Storage setting */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 10, letterSpacing: '.12em', color: '#7E858C' }}>
              ALMACENAMIENTO MÁXIMO DE GRABACIONES
            </label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="number"
                min="1"
                max="10000"
                step="0.5"
                value={value}
                onChange={e => setValue(e.target.value)}
                style={{
                  flex: 1, padding: '10px 14px', border: '2px solid #20242A', borderRadius: 10,
                  background: '#0C0E10', color: '#ECE8E1',
                  fontFamily: "'DM Mono', monospace", fontSize: 14, outline: 'none',
                }}
              />
              <span style={{ fontSize: 12, color: '#7E858C', letterSpacing: '.06em', flexShrink: 0 }}>GB</span>
            </div>
            <p style={{ fontSize: 9, color: '#565C63', letterSpacing: '.06em', lineHeight: 1.6, margin: 0 }}>
              Se mostrará aviso cuando el uso supere el 80% y alerta crítica al 95%.
            </p>

            {/* Quick presets */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {[10, 50, 100, 250, 500, 1000].map(gb => (
                <button
                  key={gb}
                  onClick={() => setValue(String(gb))}
                  style={{
                    padding: '4px 12px', borderRadius: 7, cursor: 'pointer',
                    border: value === String(gb) ? '1px solid #E07820' : '1px solid #20242A',
                    background: value === String(gb) ? '#1A130A' : 'transparent',
                    color: value === String(gb) ? '#E07820' : '#7E858C',
                    fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: '.04em',
                  }}
                >
                  {gb >= 1000 ? `${gb / 1000} TB` : `${gb} GB`}
                </button>
              ))}
            </div>
          </div>

          {/* Sound setting */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#7E858C' }}>
                SONIDO DE ALERTAS
              </div>
              <p style={{ fontSize: 9, color: '#565C63', letterSpacing: '.06em', lineHeight: 1.6, margin: '4px 0 0' }}>
                Pitido al detectar movimiento o generar una grabación nueva.
              </p>
            </div>
            <button
              onClick={onToggleSound}
              title={soundEnabled ? 'Silenciar alertas' : 'Activar sonido de alertas'}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                border: soundEnabled ? '2px solid #1f5a3a' : '2px solid #20242A',
                background: soundEnabled ? '#0B1A14' : '#0C0E10',
                color: soundEnabled ? '#36D399' : '#7E858C',
                fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '.06em',
              }}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {soundEnabled ? 'ACTIVADO' : 'SILENCIADO'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '2px solid #20242A',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
              border: '2px solid #20242A', background: 'transparent', color: '#7E858C',
              fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '.06em',
            }}
          >
            CANCELAR
          </button>
          <button
            onClick={handleSave}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
              border: '2px solid #E07820', background: '#1A130A', color: '#E07820',
              fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '.06em',
            }}
          >
            <Save size={13} /> GUARDAR
          </button>
        </div>
      </div>
    </div>
  )
}
