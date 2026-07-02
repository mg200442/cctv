import { useState, useEffect } from 'react'
import { X, Video, Download, Trash2, Play } from 'lucide-react'
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

export function CameraRecsModal({ cameraId, cameraLabel, recordings, initialRecordingName, onDelete, onClose }: Props) {
  const [activeRec, setActiveRec] = useState<Recording | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

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
          width: 540, maxHeight: '82vh', display: 'flex', flexDirection: 'column',
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

            return (
              <div
                key={rec.name}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                  border: `2px solid ${isPlaying ? '#E07820' : '#20242A'}`,
                  borderRadius: 10, background: isPlaying ? '#1A130A' : '#0A0C0D',
                  transition: 'border-color .15s',
                }}
              >
                <Video size={15} color={isPlaying ? '#E07820' : '#7E858C'} style={{ flexShrink: 0 }} />

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
