import { useState, useRef, useEffect } from 'react'
import { SlidersHorizontal, Maximize2, Minimize2, LayoutGrid, ChevronUp, ChevronDown } from 'lucide-react'
import type { Camera } from '@/types/camera'
import { CameraCard } from './CameraCard'
import { CameraSlot } from './CameraSlot'

const MAX_CAMERAS = 9

const GRID_PRESETS = [
  { cols: 1, rows: 1, label: '1×1' },
  { cols: 2, rows: 1, label: '2×1' },
  { cols: 2, rows: 2, label: '2×2' },
  { cols: 3, rows: 2, label: '3×2' },
  { cols: 3, rows: 3, label: '3×3' },
  { cols: 4, rows: 3, label: '4×3' },
  { cols: 4, rows: 4, label: '4×4' },
]

interface Props {
  cameras: Camera[]
  selected: number | null
  playbackCameraId: string | null
  now: Date
  snapshotUrl: (id: string) => string
  onSelect: (i: number) => void
  onAddClick: () => void
  onStartRec: (id: string) => void
  onStopRec: (id: string) => void
  onShowRecs: (id: string) => void
  onRename: (id: string) => void
  onRemove: (id: string) => void
  onFullscreen: (i: number) => void
}

export function CameraGrid({
  cameras, selected, playbackCameraId, now, snapshotUrl,
  onSelect, onAddClick, onStartRec, onStopRec, onShowRecs, onRename, onRemove, onFullscreen,
}: Props) {
  const [focusMode, setFocusMode] = useState(false)
  const [gridCols, setGridCols] = useState(() => {
    try { return parseInt(localStorage.getItem('gridCols') ?? '3') || 3 } catch { return 3 }
  })
  const [gridRows, setGridRows] = useState(() => {
    try { return parseInt(localStorage.getItem('gridRows') ?? '3') || 3 } catch { return 3 }
  })
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPicker])

  const totalSlots = gridCols * gridRows
  const focusCam = selected !== null ? cameras[selected] : undefined
  const currentPreset = `${gridCols}×${gridRows}`

  return (
    <main style={{
      flex: 1, minWidth: 0, padding: 16,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, letterSpacing: '.12em', color: '#7E858C' }}>VISTA EN VIVO</span>
        <span style={{ fontSize: 11, letterSpacing: '.12em', color: '#565C63' }}>·</span>
        <span style={{ fontSize: 11, letterSpacing: '.12em', color: '#ECE8E1' }}>
          FOCO: {focusCam?.zone ?? '—'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {/* Grid picker */}
          <div ref={pickerRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPicker(s => !s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
                border: showPicker ? '2px solid #E07820' : '2px solid #20242A',
                background: showPicker ? '#1A130A' : '#0E1012',
                color: showPicker ? '#E07820' : '#ECE8E1',
                fontFamily: "'DM Mono',monospace", fontSize: 10,
                letterSpacing: '.06em',
              }}
            >
              <LayoutGrid size={14} />
              {currentPreset}
            </button>

            {showPicker && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6,
                background: '#0E1012', border: '2px solid #20242A', borderRadius: 12,
                padding: 12, zIndex: 50,
                display: 'flex', flexDirection: 'column', gap: 6,
                minWidth: 140,
              }}>
                <span style={{ fontSize: 8, letterSpacing: '.14em', color: '#565C63', marginBottom: 4 }}>
                  DISPOSICIÓN
                </span>
                {GRID_PRESETS.map(p => {
                  const active = gridCols === p.cols && gridRows === p.rows
                  return (
                    <button
                      key={p.label}
                      onClick={() => {
                        setGridCols(p.cols); setGridRows(p.rows); setShowPicker(false)
                        try { localStorage.setItem('gridCols', String(p.cols)); localStorage.setItem('gridRows', String(p.rows)) } catch {}
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${active ? '#E07820' : '#20242A'}`,
                        background: active ? '#1A130A' : 'transparent',
                        color: active ? '#E07820' : '#C9C4BB',
                        fontFamily: "'DM Mono',monospace", fontSize: 10,
                        letterSpacing: '.06em', textAlign: 'left',
                      }}
                    >
                      {/* Mini grid visual */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${p.cols}, 1fr)`,
                        gap: 2, width: p.cols * 7 + (p.cols - 1) * 2,
                        flexShrink: 0,
                      }}>
                        {Array.from({ length: p.cols * Math.min(p.rows, 3) }, (_, i) => (
                          <div key={i} style={{
                            width: 7, height: 5, borderRadius: 1,
                            background: active ? '#E07820' : '#3A3F47',
                          }} />
                        ))}
                      </div>
                      {p.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <button style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '7px 12px', border: '2px solid #20242A', borderRadius: 10,
            background: '#0E1012', color: '#ECE8E1',
            fontFamily: "'DM Mono',monospace", fontSize: 10,
            letterSpacing: '.06em', cursor: 'pointer',
          }}>
            <SlidersHorizontal size={14} />
            FILTROS
          </button>

          <button
            onClick={() => setFocusMode(f => !f)}
            title={focusMode ? 'Vista en grid' : 'Modo foco'}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
              border: focusMode ? '2px solid #E07820' : '2px solid #20242A',
              background: focusMode ? '#1A130A' : '#0E1012',
              color: focusMode ? '#E07820' : '#ECE8E1',
              fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '.06em',
            }}
          >
            {focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {focusMode ? 'GRID' : 'FOCO'}
          </button>
        </div>
      </div>

      {/* ── FOCUS MODE ── */}
      {focusMode && focusCam ? (
        <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
          {/* Main camera — 70% */}
          <div style={{ flex: 7, minHeight: 0 }}>
            <CameraCard
              camera={focusCam}
              isPlayback={playbackCameraId === focusCam.id}
              isSelected
              now={now}
              snapshotUrl={snapshotUrl(focusCam.id)}
              onSelect={() => {}}
              onFullscreen={() => onFullscreen(selected!)}
              onStartRec={() => onStartRec(focusCam.id)}
              onStopRec={() => onStopRec(focusCam.id)}
              onShowRecs={() => onShowRecs(focusCam.id)}
              onRename={() => onRename(focusCam.id)}
              onRemove={() => onRemove(focusCam.id)}
            />
          </div>

          {/* Thumbnail strip — 30% */}
          <div style={{ flex: 3, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Nav controls */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0, marginBottom: 8,
            }}>
              <span style={{ fontSize: 9, letterSpacing: '.1em', color: '#565C63' }}>
                {selected! + 1} / {cameras.length}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => onSelect(selected! > 0 ? selected! - 1 : cameras.length - 1)}
                  style={{
                    width: 24, height: 24, borderRadius: 6, border: '1px solid #20242A',
                    background: '#0E1012', color: '#7E858C', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  title="Cámara anterior"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  onClick={() => onSelect(selected! < cameras.length - 1 ? selected! + 1 : 0)}
                  style={{
                    width: 24, height: 24, borderRadius: 6, border: '1px solid #20242A',
                    background: '#0E1012', color: '#7E858C', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  title="Cámara siguiente"
                >
                  <ChevronDown size={13} />
                </button>
              </div>
            </div>

            {/* Scrollable list — main camera excluded */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
              {cameras.map((cam, i) => {
                if (i === selected) return null
                return (
                  <div key={cam.id} style={{ flexShrink: 0, height: 110 }}>
                    <CameraCard
                      camera={cam}
                      isPlayback={playbackCameraId === cam.id}
                      now={now}
                      snapshotUrl={snapshotUrl(cam.id)}
                      onSelect={() => onSelect(i)}
                      onFullscreen={() => onFullscreen(i)}
                      onStartRec={() => onStartRec(cam.id)}
                      onStopRec={() => onStopRec(cam.id)}
                      onShowRecs={() => onShowRecs(cam.id)}
                      onRename={() => onRename(cam.id)}
                      onRemove={() => onRemove(cam.id)}
                    />
                  </div>
                )
              })}
              {cameras.length < MAX_CAMERAS && (
                <div style={{ flexShrink: 0, height: 110 }}>
                  <CameraSlot onAdd={onAddClick} />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── GRID MODE ── */
        <div style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gridTemplateRows: `repeat(${gridRows}, 1fr)`,
          gap: 12, minHeight: 0,
        }}>
          {Array.from({ length: totalSlots }, (_, i) => {
            const cam = cameras[i]
            if (cam) {
              return (
                <CameraCard
                  key={cam.id}
                  camera={cam}
                  isPlayback={playbackCameraId === cam.id}
                  isSelected={i === selected}
                  now={now}
                  snapshotUrl={snapshotUrl(cam.id)}
                  onSelect={() => onSelect(i)}
                  onFullscreen={() => onFullscreen(i)}
                  onStartRec={() => onStartRec(cam.id)}
                  onStopRec={() => onStopRec(cam.id)}
                  onShowRecs={() => onShowRecs(cam.id)}
                  onRename={() => onRename(cam.id)}
                  onRemove={() => onRemove(cam.id)}
                />
              )
            }
            if (cameras.length < MAX_CAMERAS) return <CameraSlot key={`slot-${i}`} onAdd={onAddClick} />
            return <div key={`slot-${i}`} style={{ borderRadius: 10, border: '1px solid #1A1D20', background: '#08090A' }} />
          })}
        </div>
      )}
    </main>
  )
}
