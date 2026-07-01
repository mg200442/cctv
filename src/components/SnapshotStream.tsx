import { useState, useEffect, useRef } from 'react'
import { Unplug } from 'lucide-react'

const POLL_MS = 150
const FAIL_LIMIT = 5
const RETRY_MS = 4000

export function SnapshotStream({ snapshotUrl, label }: { snapshotUrl: string; label: string }) {
  const [src, setSrc] = useState('')
  const [visible, setVisible] = useState(false)
  const [dead, setDead] = useState(false)
  const fails = useRef(0)

  useEffect(() => {
    if (dead) return
    fails.current = 0
    let id: ReturnType<typeof setTimeout>
    let alive = true
    const go = () => {
      if (!alive) return
      setSrc(`${snapshotUrl}?t=${Date.now()}`)
      id = setTimeout(go, POLL_MS)
    }
    go()
    return () => { alive = false; clearTimeout(id) }
  }, [snapshotUrl, dead])

  useEffect(() => {
    if (!dead) return
    const id = setTimeout(() => { setDead(false); setVisible(false) }, RETRY_MS)
    return () => clearTimeout(id)
  }, [dead])

  return (
    <>
      <img
        src={src}
        alt={label}
        onLoad={() => { fails.current = 0; setVisible(true) }}
        onError={() => { if (++fails.current >= FAIL_LIMIT) setDead(true) }}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          opacity: visible && !dead ? 1 : 0,
          transition: 'opacity .4s',
        }}
      />
      {dead && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 10, background: 'rgba(8,9,10,.88)',
        }}>
          <Unplug size={26} color="#FF5247" />
          <span style={{ fontSize: 10, letterSpacing: '.14em', color: '#FF8079', fontFamily: "'DM Mono',monospace" }}>
            SEÑAL PERDIDA
          </span>
          <span style={{ fontSize: 8, letterSpacing: '.08em', color: '#565C63' }}>
            reconectando…
          </span>
        </div>
      )}
    </>
  )
}
