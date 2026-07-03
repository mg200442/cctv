import { useState, useEffect } from 'react'
import { X, Video, Download, Trash2, Play, Square, CheckSquare } from 'lucide-react'
import type { Recording } from '@/hooks/useCameras'
import { VideoPlayer } from './VideoPlayer'

interface Props {
  cameraId: string
  cameraLabel: string
  recordings: Recording[]
  initialRecordingName?: string
  onDelete: (name: string) => Promise<void>
  onClose: () => void
}

function thumbnailUrl(name: string): string {
  return `/api/recordings/${encodeURIComponent(name)}/thumbnail`
}

// Triggers N downloads back-to-back with a small stagger — firing them all
// in the same tick makes some browsers silently drop all but the first
// (treated as popup-like spam without a fresh user gesture per click).
function downloadAll(recs: Recording[]) {
  recs.forEach((rec, i) => {
    setTimeout(() => {
      const a = document.createElement('a')
      a.href = rec.url
      a.download = rec.name
      document.body.appendChild(a)
      a.click()
      a.remove()
    }, i * 300)
  })
}

export function CameraRecsModal({ cameraId, cameraLabel, recordings, initialRecordingName, onDelete, onClose }: Props) {
  const [activeRec, setActiveRec] = useState<Recording | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Opening the modal from an alert can race the recordings list: an
  // alert-triggered recording finishes seconds ago and might not be in
  // `recordings` yet (5s poll) at the moment the user clicks. A one-time
  // lazy useState init would just come up empty and never retry — this
  // effect keeps trying until the poll catches up and the entry appears.
  useEffect(() => {
    if (!initialRecordingName) return
    const found = recordings.find(r => r.name === initialRecordingName)
    if (found) setActiveRec(found)
  }, [initialRecordingName, recordings])

  const camRecs = recordings.filter(r => r.cameraId === cameraId)
  const allSelected = camRecs.length > 0 && camRecs.every(r => selected.has(r.name))

  function toggleSelected(name: string) {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(camRecs.map(r => r.name)))
  }

  async function handleDelete(name: string) {
    setDeleting(name)
    try {
      await onDelete(name)
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
      if (activeRec?.name === name) setActiveRec(null)
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      // Sequential, not Promise.all — onDelete re-fetches the recordings
      // list after every call, so firing them all at once would mean N
      // redundant concurrent fetches for what's typically a handful of files.
      for (const name of selected) {
        await onDelete(name)
        if (activeRec?.name === name) setActiveRec(null)
      }
    } finally {
      setSelected(new Set())
      setConfirmBulkDelete(false)
      setBulkDeleting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(8,9,10,.88)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 560, maxHeight: '82vh', display: 'flex', flexDirection: 'column',
          background: '#0E1012', border: '2px solid #20242A', borderRadius: 16, overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '2px solid #20242A', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: '#1A0E0D',
              border: '2px solid #FF5247', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#FF5247',
            }}>
              <Trash2 size={14} />
            </div>
            <div>
              <div style={{ fontSize: 13, letterSpacing: '.08em', color: '#ECE8E1' }}>
                {cameraLabel.toUpperCase()}
              </div>
              <div style={{ fontSize: 9, letterSpacing: '.1em', color: '#7E858C', marginTop: 1 }}>
                {camRecs.length} GRABACIÓN{camRecs.length !== 1 ? 'ES' : ''}
              </div>
            </div>
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

        {/* Video player */}
        {activeRec && (
          <div style={{ borderBottom: '2px solid #20242A', flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 16px', background: '#0E1012', borderBottom: '1px solid #20242A',
            }}>
              <span style={{ fontSize: 10, color: '#C9C4BB', letterSpacing: '.04em' }}>
                {activeRec.date} {activeRec.time}
              </span>
              <button
                onClick={() => setActiveRec(null)}
                style={{ background: 'none', border: 'none', color: '#7E858C', cursor: 'pointer', display: 'flex' }}
              >
                <X size={12} />
              </button>
            </div>
            <VideoPlayer url={activeRec.url} maxHeight={260} />
          </div>
        )}

        {/* Selection bar — always shows "select all", switches to bulk
            actions once something is checked. */}
        {camRecs.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 16px', borderBottom: '2px solid #20242A', flexShrink: 0,
          }}>
            <button
              onClick={toggleSelectAll}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'none', border: 'none', cursor: 'pointer',
                color: allSelected ? '#E07820' : '#7E858C',
                fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '.08em',
              }}
            >
              {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
              {selected.size > 0 ? `${selected.size} SELECCIONADA${selected.size !== 1 ? 'S' : ''}` : 'SELECCIONAR TODAS'}
            </button>

            {selected.size > 0 && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => downloadAll(camRecs.filter(r => selected.has(r.name)))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                    border: '1px solid #20242A', background: '#0E1012', color: '#C9C4BB',
                    fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '.06em',
                  }}
                >
                  <Download size={11} /> DESCARGAR
                </button>
                {confirmBulkDelete ? (
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    style={{
                      padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                      border: '1px solid #FF5247', background: '#1A0E0D',
                      color: '#FF5247', fontSize: 9, letterSpacing: '.06em',
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {bulkDeleting ? 'BORRANDO…' : `CONFIRMAR (${selected.size})`}
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmBulkDelete(true)}
                    onMouseLeave={() => setConfirmBulkDelete(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                      border: '1px solid #20242A', background: '#0E1012', color: '#C9C4BB',
                      fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '.06em',
                    }}
                  >
                    <Trash2 size={11} /> BORRAR
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recording list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {camRecs.length === 0 && (
            <div style={{
              padding: '32px 0', textAlign: 'center',
              fontSize: 11, color: '#565C63', letterSpacing: '.06em',
            }}>
              Sin grabaciones para esta cámara.
            </div>
          )}

          {camRecs.map(rec => {
            const isConfirming = confirmDelete === rec.name
            const isDeleting = deleting === rec.name
            const isPlaying = activeRec?.name === rec.name
            const isSelected = selected.has(rec.name)

            return (
              <div
                key={rec.name}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                  border: `2px solid ${isPlaying ? '#E07820' : isSelected ? '#3A3F47' : '#20242A'}`,
                  borderRadius: 10, background: isPlaying ? '#1A130A' : '#0A0C0D',
                  transition: 'border-color .15s',
                }}
              >
                <button
                  onClick={() => toggleSelected(rec.name)}
                  title={isSelected ? 'Deseleccionar' : 'Seleccionar'}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
                    color: isSelected ? '#E07820' : '#3A3F47', display: 'flex',
                  }}
                >
                  {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                </button>

                {/* Thumbnail — server generates it on first request (see
                    /api/recordings/:file/thumbnail) and caches it, so this
                    is just a plain <img>; a failed/slow generation (very
                    old or corrupt file) falls back to the plain Video icon
                    instead of a broken-image glyph. */}
                <div style={{
                  width: 56, height: 32, borderRadius: 5, flexShrink: 0, overflow: 'hidden',
                  background: '#111417', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <img
                    src={thumbnailUrl(rec.name)}
                    alt=""
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => {
                      e.currentTarget.style.display = 'none'
                      const icon = e.currentTarget.nextElementSibling as HTMLElement | null
                      if (icon) icon.style.display = 'flex'
                    }}
                  />
                  <div style={{ display: 'none', alignItems: 'center', justifyContent: 'center' }}>
                    <Video size={14} color="#565C63" />
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#ECE8E1', letterSpacing: '.04em' }}>
                    {rec.date} · {rec.time}
                  </div>
                  <div style={{ fontSize: 9, color: '#565C63', letterSpacing: '.06em', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rec.name}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {/* Play */}
                  <button
                    onClick={() => setActiveRec(isPlaying ? null : rec)}
                    title={isPlaying ? 'Cerrar' : 'Reproducir'}
                    style={{
                      width: 28, height: 28, borderRadius: 7, cursor: 'pointer',
                      border: `1px solid ${isPlaying ? '#E07820' : '#20242A'}`,
                      background: isPlaying ? '#1A130A' : '#0E1012',
                      color: isPlaying ? '#E07820' : '#C9C4BB',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Play size={11} />
                  </button>

                  {/* Download */}
                  <a
                    href={rec.url}
                    download={rec.name}
                    title="Descargar"
                    style={{
                      width: 28, height: 28, borderRadius: 7,
                      border: '1px solid #20242A', background: '#0E1012',
                      color: '#C9C4BB', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', textDecoration: 'none',
                    }}
                  >
                    <Download size={11} />
                  </a>

                  {/* Delete */}
                  {isConfirming ? (
                    <button
                      onClick={() => handleDelete(rec.name)}
                      disabled={isDeleting}
                      style={{
                        padding: '0 10px', height: 28, borderRadius: 7, cursor: 'pointer',
                        border: '1px solid #FF5247', background: '#1A0E0D',
                        color: '#FF5247', fontSize: 9, letterSpacing: '.08em',
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {isDeleting ? '…' : 'BORRAR'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(rec.name)}
                      title="Eliminar grabación"
                      style={{
                        width: 28, height: 28, borderRadius: 7, cursor: 'pointer',
                        border: '1px solid #20242A', background: '#0E1012',
                        color: '#7E858C', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseLeave={() => { if (confirmDelete === rec.name) setConfirmDelete(null) }}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
