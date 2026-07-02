import { useState } from 'react'
import {
  Play, Square, Trash2, Video, Camera as CameraIcon, Search as ScanIcon,
  User, Car, Bike, Dog, Cat, Briefcase, LayoutGrid, List,
} from 'lucide-react'
import type { Detection, DetectionStatus } from '@/types/camera'
import { detectionFrameUrl } from '@/hooks/useDetection'

interface Props {
  status: DetectionStatus
  results: Detection[]
  classFilter: string[]
  onRun: () => void
  onStop: () => void
  onClearResults: () => void
  onViewRecording: (name: string) => void
  onViewSnapshot: (name: string) => void
}

const CLASS_ICON: Record<string, React.ElementType> = {
  person: User, car: Car, truck: Car, bus: Car, motorcycle: Bike, bicycle: Bike,
  dog: Dog, cat: Cat, backpack: Briefcase, handbag: Briefcase, suitcase: Briefcase,
}

function fmtWhen(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Filenames are `${cameraId}_${timestamp}.ext` — same parsing used across
// the app (useCameras.ts's parseRecording) for recordings/snapshots.
function parseName(name: string) {
  const [cameraId, rest] = name.replace(/\.(mp4|jpg)$/, '').split('_')
  const [date, rawTime] = rest?.split('T') ?? ['', '']
  const time = rawTime?.replace(/-/g, ':') ?? ''
  return { cameraId, date, time }
}

// One row per detected class per file — a video with both "person" and
// "dog" hits shows as two entries, each with its own frame thumbnail, so
// every claim is backed by the actual image the model saw.
interface Hit {
  fileName: string
  kind: 'recording' | 'snapshot'
  class: string
  score: number
  frame: string
  scannedAt: string
}

function toHits(results: Detection[], classFilter: string[]): Hit[] {
  const hits: Hit[] = []
  for (const r of results) {
    for (const c of r.classes) {
      if (!classFilter.includes(c.class)) continue
      hits.push({ fileName: r.name, kind: r.kind, class: c.class, score: c.score, frame: c.frame, scannedAt: r.scannedAt })
    }
  }
  return hits
}

export function DetectionPanel({
  status, results, classFilter, onRun, onStop, onClearResults, onViewRecording, onViewSnapshot,
}: Props) {
  const [view, setView] = useState<'list' | 'gallery'>('gallery')
  const hits = toHits(results, classFilter)
  const progressPct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0

  const openSource = (hit: Hit) => hit.kind === 'recording' ? onViewRecording(hit.fileName) : onViewSnapshot(hit.fileName)

  return (
    <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header / controls */}
      <div style={{
        padding: '16px 20px', borderBottom: '2px solid #20242A',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: '.1em', color: '#ECE8E1' }}>
            DETECCIÓN DE OBJETOS
          </div>
          <div style={{ fontSize: 9, color: '#7E858C', letterSpacing: '.06em', marginTop: 3 }}>
            Busca personas, vehículos y más en grabaciones y snapshots ya capturados — no es en tiempo real.
          </div>
        </div>

        {status.running ? (
          <button
            onClick={onStop}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
              border: '2px solid #5A1F1B', background: '#1A0E0D', color: '#FF5247',
              fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '.06em',
            }}
          >
            <Square size={14} /> DETENER
          </button>
        ) : (
          <button
            onClick={onRun}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
              border: '2px solid #E07820', background: '#1A130A', color: '#E07820',
              fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '.06em',
            }}
          >
            <Play size={14} /> EJECUTAR ANÁLISIS
          </button>
        )}
      </div>

      {/* Progress */}
      {status.running && (
        <div style={{ padding: '14px 20px', borderBottom: '2px solid #20242A', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: '#38BDF8', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ScanIcon size={12} className="live-dot" />
              Analizando… {status.currentFile ?? ''}
            </span>
            <span style={{ fontSize: 10, color: '#7E858C' }}>{status.done}/{status.total}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: '#20242A', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progressPct}%`, background: '#38BDF8',
              transition: 'width .3s',
            }} />
          </div>
          <div style={{ fontSize: 8, color: '#565C63', marginTop: 8, letterSpacing: '.04em' }}>
            Directo y detección de movimiento pausados mientras corre — se reanudan solos al terminar.
          </div>
        </div>
      )}

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {results.length === 0 && !status.running && (
          <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 12, color: '#565C63', letterSpacing: '.06em' }}>
            Sin análisis todavía.<br />
            <span style={{ fontSize: 10, marginTop: 6, display: 'block', color: '#3A3F47' }}>
              Pulsa EJECUTAR ANÁLISIS para buscar personas y vehículos en tus grabaciones y snapshots.
            </span>
          </div>
        )}

        {results.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 9, letterSpacing: '.1em', color: '#7E858C' }}>
              {hits.length} DETECCIONES · {results.length} ARCHIVOS ANALIZADOS
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', border: '1px solid #20242A', borderRadius: 8, overflow: 'hidden' }}>
                {([['gallery', LayoutGrid], ['list', List]] as const).map(([mode, Icon]) => (
                  <button
                    key={mode}
                    onClick={() => setView(mode)}
                    title={mode === 'gallery' ? 'Vista galería' : 'Vista lista'}
                    style={{
                      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', border: 'none',
                      background: view === mode ? '#1A130A' : '#0E1012',
                      color: view === mode ? '#E07820' : '#7E858C',
                    }}
                  >
                    <Icon size={13} />
                  </button>
                ))}
              </div>
              <button
                onClick={onClearResults}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid #20242A', background: '#0E1012',
                  color: '#7E858C', fontSize: 9, letterSpacing: '.06em',
                  fontFamily: "'DM Mono',monospace",
                }}
              >
                <Trash2 size={11} /> BORRAR HISTORIAL
              </button>
            </div>
          </div>
        )}

        {results.length > 0 && hits.length === 0 && (
          <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 11, color: '#565C63' }}>
            Nada detectado con los filtros activos (revisa Configuración).
          </div>
        )}

        {view === 'gallery' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {hits.map((h, i) => {
              const { cameraId, date, time } = parseName(h.fileName)
              const Icon = CLASS_ICON[h.class] ?? ScanIcon
              return (
                <div
                  key={`${h.fileName}-${h.class}-${i}`}
                  onClick={() => openSource(h)}
                  style={{
                    border: '2px solid #20242A', borderRadius: 10, overflow: 'hidden',
                    cursor: 'pointer', background: '#0A0C0D', transition: 'border-color .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#3A3F47')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#20242A')}
                >
                  <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000' }}>
                    <img
                      src={detectionFrameUrl(h.frame)}
                      alt={h.class}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <span style={{
                      position: 'absolute', top: 8, left: 8,
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '3px 8px', borderRadius: 6,
                      background: 'rgba(8,9,10,.8)', border: '1px solid rgba(56,189,248,.6)',
                      color: '#38BDF8', fontSize: 9, letterSpacing: '.04em',
                    }}>
                      <Icon size={11} />
                      {h.class} · {Math.round(h.score * 100)}%
                    </span>
                    <span style={{
                      position: 'absolute', top: 8, right: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 22, height: 22, borderRadius: 6,
                      background: 'rgba(8,9,10,.8)', border: '1px solid #20242A', color: '#C9C4BB',
                    }}>
                      {h.kind === 'recording' ? <Video size={11} /> : <CameraIcon size={11} />}
                    </span>
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#ECE8E1', letterSpacing: '.02em' }}>
                      {cameraId.toUpperCase()} · {date} {time}
                    </div>
                    <div style={{ fontSize: 8, color: '#565C63', marginTop: 2 }}>
                      fuente: {h.fileName}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hits.map((h, i) => {
              const { cameraId, date, time } = parseName(h.fileName)
              const Icon = CLASS_ICON[h.class] ?? ScanIcon
              return (
                <div
                  key={`${h.fileName}-${h.class}-${i}`}
                  onClick={() => openSource(h)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px 8px 8px',
                    border: '2px solid #20242A', borderRadius: 10, background: '#0A0C0D',
                    cursor: 'pointer', transition: 'border-color .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#3A3F47')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#20242A')}
                >
                  <img
                    src={detectionFrameUrl(h.frame)}
                    alt={h.class}
                    style={{ width: 64, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: '#000' }}
                  />
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #E07820', color: '#E07820', background: '#1A130A',
                  }}>
                    {h.kind === 'recording' ? <Video size={13} /> : <CameraIcon size={13} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: '#ECE8E1', letterSpacing: '.02em' }}>
                      {cameraId.toUpperCase()} · {date} {time}
                    </div>
                    <div style={{ fontSize: 8, color: '#565C63', marginTop: 3 }}>
                      fuente: {h.fileName}
                    </div>
                  </div>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                    padding: '3px 9px', borderRadius: 5,
                    background: '#0B1620', border: '1px solid rgba(56,189,248,.4)',
                    color: '#38BDF8', fontSize: 9, letterSpacing: '.04em',
                  }}>
                    <Icon size={10} />
                    {h.class} · {Math.round(h.score * 100)}%
                  </span>
                  <div style={{ fontSize: 8, color: '#565C63', flexShrink: 0, textAlign: 'right', width: 88 }}>
                    {fmtWhen(h.scannedAt)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
