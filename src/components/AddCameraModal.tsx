import { useState } from 'react'
import { X, Plus, Scan, Loader, Check, Wifi, ChevronDown, ChevronUp, Zap } from 'lucide-react'

interface Props {
  onAdd: (label: string, zone: string, rtsp: string) => Promise<void>
  onClose: () => void
}

interface DiscoveredCamera {
  ip: string
  rtspPort: number
  openPorts: number[]
  vendor: string
  candidates: string[]
  verified: string | null   // first URL that actually streamed
}

const VENDOR_LABEL: Record<string, string> = {
  zosi: 'Zosi',
  hikvision: 'Hikvision',
  dahua: 'Dahua',
  reolink: 'Reolink',
  generic: 'Cámara IP',
}

const VENDOR_COLOR: Record<string, string> = {
  zosi: '#E07820',
  hikvision: '#38BDF8',
  dahua: '#36D399',
  reolink: '#A78BFA',
  generic: '#7E858C',
}

export function AddCameraModal({ onAdd, onClose }: Props) {
  const [mode, setMode] = useState<'discover' | 'manual'>('discover')

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(8,9,10,.88)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 520, maxHeight: '88vh', overflowY: 'auto',
          background: '#0E1012', border: '2px solid #20242A',
          borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: '#1A130A',
              border: '2px solid #E07820', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#E07820',
            }}>
              <Plus size={16} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#ECE8E1', letterSpacing: '.06em' }}>
                AÑADIR CÁMARA
              </div>
              <div style={{ fontSize: 9, color: '#7E858C', letterSpacing: '.1em', marginTop: 1 }}>
                STREAM RTSP/IP
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{
            width: 28, height: 28, border: '2px solid #20242A', borderRadius: 8,
            background: 'transparent', color: '#7E858C',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <X size={14} />
          </button>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(['discover', 'manual'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
              border: mode === m ? '2px solid #E07820' : '2px solid #20242A',
              background: mode === m ? '#1A130A' : 'transparent',
              color: mode === m ? '#E07820' : '#7E858C',
              fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '.08em',
            }}>
              {m === 'discover' ? '⟳ ESCANEAR RED' : '+ MANUAL'}
            </button>
          ))}
        </div>

        {mode === 'discover'
          ? <DiscoverTab onAdd={onAdd} onClose={onClose} />
          : <ManualTab onAdd={onAdd} onClose={onClose} />}
      </div>
    </div>
  )
}

// ─── Discover tab ─────────────────────────────────────────────────────────────

function DiscoverTab({ onAdd, onClose }: { onAdd: Props['onAdd']; onClose: () => void }) {
  const [scanning, setScanning] = useState(false)
  const [found, setFound] = useState<DiscoveredCamera[]>([])
  const [scanned, setScanned] = useState(false)
  const [selected, setSelected] = useState<DiscoveredCamera | null>(null)
  const [selectedUrl, setSelectedUrl] = useState('')
  const [showAllUrls, setShowAllUrls] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [label, setLabel] = useState('')
  const [zone, setZone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function scan() {
    setScanning(true)
    setFound([])
    setScanned(false)
    setSelected(null)
    setSelectedUrl('')
    setTestResult(null)
    setError('')
    try {
      const res = await fetch('/api/discover')
      const data: DiscoveredCamera[] = await res.json()
      setFound(data)
    } catch {
      setError('Error al escanear. Comprueba la conexión.')
    } finally {
      setScanning(false)
      setScanned(true)
    }
  }

  function pickCamera(cam: DiscoveredCamera) {
    setSelected(cam)
    setSelectedUrl(cam.verified ?? cam.candidates[0] ?? '')
    setTestResult(cam.verified ? true : null)
    setShowAllUrls(false)
  }

  async function testUrl(url: string) {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/test-rtsp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const { ok } = await res.json()
      setTestResult(ok)
      if (ok) setSelectedUrl(url)
    } catch {
      setTestResult(false)
    } finally {
      setTesting(false)
    }
  }

  async function handleAdd() {
    if (!selected || !label.trim()) { setError('Selecciona una cámara y pon un nombre'); return }
    if (!selectedUrl) { setError('Selecciona o prueba una URL RTSP'); return }
    setSaving(true)
    setError('')
    try {
      await onAdd(label.trim(), zone.trim(), selectedUrl)
      onClose()
    } catch {
      setError('No se pudo añadir la cámara.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button
        onClick={scan}
        disabled={scanning}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '12px', border: '2px solid #20242A', borderRadius: 12,
          background: '#0C0E10', color: scanning ? '#7E858C' : '#ECE8E1',
          fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '.08em',
          cursor: scanning ? 'wait' : 'pointer',
        }}
      >
        {scanning
          ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> BUSCANDO DISPOSITIVOS… (~10s)</>
          : <><Scan size={14} /> BUSCAR CÁMARAS EN LA RED</>}
      </button>

      {scanned && found.length === 0 && !scanning && (
        <div style={{
          padding: '14px', border: '2px solid #20242A', borderRadius: 10,
          background: '#0A0C0E',
        }}>
          <p style={{ fontSize: 11, color: '#7E858C', letterSpacing: '.04em', marginBottom: 8, textAlign: 'center' }}>
            No se encontraron cámaras nuevas. Antes de reintentar, comprueba en orden:
          </p>
          <ol style={{
            fontSize: 9, color: '#565C63', letterSpacing: '.03em', lineHeight: 1.8,
            margin: 0, paddingLeft: 16,
          }}>
            <li>Alimentación de la cámara: LED encendido.</li>
            <li>Cable de red bien encajado en ambos extremos (cámara y router).</li>
            <li>El puerto del router muestra LED de enlace/actividad junto al puerto usado.</li>
            <li>Si es Zosi u otra marca con IP fija de fábrica fuera de tu LAN habitual: puede necesitar un alias de red en este equipo para ser alcanzable — ver README/CLAUDE.md, sección de red.</li>
          </ol>
          <p style={{ fontSize: 9, color: '#565C63', letterSpacing: '.04em', lineHeight: 1.6, marginTop: 8, textAlign: 'center' }}>
            Si con los 3 primeros puntos confirmados sigue sin aparecer, es probable que la unidad o el cable estén defectuosos.
          </p>
        </div>
      )}

      {found.map(cam => {
        const isSelected = selected?.ip === cam.ip
        const vColor = VENDOR_COLOR[cam.vendor] ?? '#7E858C'
        const vLabel = VENDOR_LABEL[cam.vendor] ?? 'Cámara IP'

        return (
          <div key={cam.ip} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Camera row */}
            <div
              onClick={() => isSelected ? setSelected(null) : pickCamera(cam)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
                border: `2px solid ${isSelected ? vColor : '#20242A'}`,
                borderRadius: isSelected ? '10px 10px 0 0' : 10,
                background: isSelected ? '#0C0E10' : '#0A0C0E',
                cursor: 'pointer', transition: 'border-color .15s',
              }}
            >
              <Wifi size={16} color={vColor} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#ECE8E1', letterSpacing: '.04em' }}>{cam.ip}</span>
                  <span style={{
                    fontSize: 8, letterSpacing: '.1em', padding: '2px 7px', borderRadius: 4,
                    background: vColor + '22', color: vColor, border: `1px solid ${vColor}44`,
                  }}>
                    {vLabel.toUpperCase()}
                  </span>
                  {cam.verified && (
                    <span style={{
                      fontSize: 8, letterSpacing: '.1em', padding: '2px 7px', borderRadius: 4,
                      background: '#36D39922', color: '#36D399', border: '1px solid #36D39944',
                    }}>
                      ✓ VERIFICADA
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 9, color: '#565C63', letterSpacing: '.06em', marginTop: 3 }}>
                  Puertos: {cam.openPorts.join(', ')}
                  {cam.openPorts.includes(23) && ' · Telnet disponible'}
                </div>
              </div>
              {isSelected ? <ChevronUp size={14} color="#7E858C" /> : <ChevronDown size={14} color="#7E858C" />}
            </div>

            {/* Expanded config panel */}
            {isSelected && (
              <div style={{
                border: `2px solid ${vColor}`, borderTop: 'none',
                borderRadius: '0 0 10px 10px', background: '#09090B',
                padding: '14px',
              }}>
                {/* RTSP URL selector */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 9, color: '#7E858C', letterSpacing: '.1em' }}>URL RTSP</label>
                    <button
                      onClick={() => setShowAllUrls(s => !s)}
                      style={{
                        fontSize: 9, color: '#565C63', background: 'none', border: 'none',
                        cursor: 'pointer', letterSpacing: '.06em',
                      }}
                    >
                      {showAllUrls ? 'ocultar opciones' : `ver ${cam.candidates.length} opciones`}
                    </button>
                  </div>

                  {showAllUrls ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
                      {cam.candidates.map(url => (
                        <div
                          key={url}
                          onClick={() => { setSelectedUrl(url); setTestResult(null) }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                            border: `1px solid ${selectedUrl === url ? vColor : '#20242A'}`,
                            background: selectedUrl === url ? vColor + '11' : 'transparent',
                          }}
                        >
                          <span style={{
                            fontSize: 9, color: selectedUrl === url ? '#ECE8E1' : '#7E858C',
                            fontFamily: "'DM Mono', monospace", letterSpacing: '.02em',
                            wordBreak: 'break-all',
                          }}>
                            {url}
                          </span>
                          {selectedUrl === url && <Check size={12} color={vColor} style={{ flexShrink: 0, marginLeft: 8 }} />}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: '8px 10px', borderRadius: 8,
                      border: `1px solid ${testResult === true ? '#36D399' : testResult === false ? '#FF5247' : '#20242A'}`,
                      background: '#0C0E10', display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{
                        flex: 1, fontSize: 9, color: '#C9C4BB', fontFamily: "'DM Mono', monospace",
                        letterSpacing: '.02em', wordBreak: 'break-all',
                      }}>
                        {selectedUrl || 'No disponible'}
                      </span>
                      {testResult === true && <Check size={12} color="#36D399" />}
                      {testResult === false && <span style={{ fontSize: 9, color: '#FF5247' }}>✗</span>}
                    </div>
                  )}
                </div>

                {/* Test button */}
                <button
                  onClick={() => testUrl(selectedUrl)}
                  disabled={testing || !selectedUrl}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: '8px', borderRadius: 8, marginBottom: 12,
                    border: `1px solid ${testResult === true ? '#36D399' : testResult === false ? '#FF5247' : '#38BDF8'}`,
                    background: testResult === true ? '#36D39911' : testResult === false ? '#FF524711' : '#38BDF811',
                    color: testResult === true ? '#36D399' : testResult === false ? '#FF5247' : '#38BDF8',
                    fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '.08em',
                    cursor: (testing || !selectedUrl) ? 'wait' : 'pointer',
                  }}
                >
                  {testing
                    ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> VERIFICANDO STREAM…</>
                    : testResult === true
                      ? <><Check size={12} /> STREAM OK — LISTO PARA AÑADIR</>
                      : testResult === false
                        ? '✗ SIN RESPUESTA — PRUEBA OTRA URL'
                        : <><Zap size={12} /> PROBAR CONEXIÓN</>
                  }
                </button>

                {/* Name / zone */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Field label="NOMBRE" placeholder="ej: Entrada Trasera" value={label} onChange={setLabel} />
                  <Field label="ZONA" placeholder="ej: Exterior Sur" value={zone} onChange={setZone} />
                </div>

                {error && <p style={{ fontSize: 11, color: '#FF5247', letterSpacing: '.04em', marginTop: 8 }}>{error}</p>}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <Btn label="CANCELAR" onClick={onClose} />
                  <Btn label={saving ? 'GUARDANDO…' : 'AÑADIR'} onClick={handleAdd} primary disabled={saving} />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Manual tab ────────────────────────────────────────────────────────────────

function ManualTab({ onAdd, onClose }: { onAdd: Props['onAdd']; onClose: () => void }) {
  const [label, setLabel] = useState('')
  const [zone, setZone] = useState('')
  const [rtsp, setRtsp] = useState('rtsp://')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [error, setError] = useState('')

  async function testUrl() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/test-rtsp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rtsp }),
      })
      const { ok } = await res.json()
      setTestResult(ok)
    } catch {
      setTestResult(false)
    } finally {
      setTesting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || !rtsp.trim()) { setError('Nombre y URL RTSP son obligatorios'); return }
    setSaving(true)
    setError('')
    try {
      await onAdd(label.trim(), zone.trim(), rtsp.trim())
      onClose()
    } catch {
      setError('No se pudo añadir la cámara. Comprueba la URL.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Field label="NOMBRE" placeholder="ej: Entrada Trasera" value={label} onChange={setLabel} />
      <Field label="ZONA / UBICACIÓN" placeholder="ej: Exterior Sur" value={zone} onChange={setZone} />

      <div>
        <Field
          label="URL RTSP"
          placeholder="rtsp://usuario:contraseña@192.168.x.x:554/stream"
          value={rtsp}
          onChange={v => { setRtsp(v); setTestResult(null) }}
          mono
        />
        <button
          type="button"
          onClick={testUrl}
          disabled={testing || rtsp === 'rtsp://'}
          style={{
            marginTop: 6, width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8, padding: '7px',
            borderRadius: 8,
            border: `1px solid ${testResult === true ? '#36D399' : testResult === false ? '#FF5247' : '#38BDF8'}`,
            background: testResult === true ? '#36D39911' : testResult === false ? '#FF524711' : '#38BDF811',
            color: testResult === true ? '#36D399' : testResult === false ? '#FF5247' : '#38BDF8',
            fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '.08em',
            cursor: testing ? 'wait' : 'pointer',
          }}
        >
          {testing
            ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> VERIFICANDO…</>
            : testResult === true ? <><Check size={12} /> STREAM OK</>
            : testResult === false ? '✗ SIN RESPUESTA'
            : <><Zap size={12} /> PROBAR CONEXIÓN</>}
        </button>
      </div>

      {error && <p style={{ fontSize: 11, color: '#FF5247', letterSpacing: '.04em' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <Btn label="CANCELAR" onClick={onClose} />
        <Btn label={saving ? 'GUARDANDO…' : 'AÑADIR'} type="submit" primary disabled={saving} />
      </div>
    </form>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function Field({ label, placeholder, value, onChange, mono = false }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; mono?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 9, letterSpacing: '.12em', color: '#7E858C' }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: '9px 12px', border: '2px solid #20242A', borderRadius: 10,
          background: '#0C0E10', color: '#ECE8E1',
          fontFamily: mono ? "'DM Mono', monospace" : 'inherit',
          fontSize: mono ? 11 : 12, outline: 'none',
        }}
      />
    </div>
  )
}

function Btn({ label, onClick, type = 'button', primary = false, disabled = false }: {
  label: string; onClick?: () => void; type?: 'button' | 'submit'; primary?: boolean; disabled?: boolean
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      padding: '9px 18px', borderRadius: 10, cursor: disabled ? 'wait' : 'pointer',
      border: primary ? '2px solid #E07820' : '2px solid #20242A',
      background: primary ? '#1A130A' : 'transparent',
      color: primary ? '#E07820' : '#7E858C',
      fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '.06em',
      opacity: disabled ? 0.6 : 1,
    }}>
      {label}
    </button>
  )
}
