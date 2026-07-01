import { PlusCircle } from 'lucide-react'

interface Props {
  onAdd: () => void
}

export function CameraSlot({ onAdd }: Props) {
  return (
    <button
      onClick={onAdd}
      style={{
        width: '100%', height: '100%',
        position: 'relative', borderRadius: 10, overflow: 'hidden',
        cursor: 'pointer', background: '#0a0b0c',
        border: '2px dashed #20242A',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 10,
        transition: 'border-color .2s, background .2s',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#E07820'
        ;(e.currentTarget as HTMLButtonElement).style.background = '#0f0d09'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#20242A'
        ;(e.currentTarget as HTMLButtonElement).style.background = '#0a0b0c'
      }}
    >
      <PlusCircle size={36} color="#2A2E33" strokeWidth={1.5} />
      <span style={{
        fontSize: 9, letterSpacing: '.14em', color: '#565C63',
        fontFamily: "'DM Mono', monospace",
      }}>
        AÑADIR CÁMARA
      </span>
    </button>
  )
}
