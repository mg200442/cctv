import { useState, useRef, useEffect } from 'react'

const SPEEDS = [0.5, 1, 1.25, 1.5, 2]

interface Props {
  url: string
  maxHeight?: number | string
}

export function VideoPlayer({ url, maxHeight = '60vh' }: Props) {
  const [speed, setSpeed] = useState(1)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Apply speed when video element is ready or speed changes
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [speed])

  function handleLoaded() {
    if (videoRef.current) videoRef.current.playbackRate = speed
  }

  return (
    <div>
      <video
        ref={videoRef}
        key={url}
        src={url}
        controls
        autoPlay
        onLoadedMetadata={handleLoaded}
        style={{ width: '100%', display: 'block', background: '#000', maxHeight }}
      />
      <div style={{
        display: 'flex', gap: 6, padding: '8px 14px',
        background: '#0A0C0D', borderTop: '1px solid #20242A',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 9, color: '#7E858C', letterSpacing: '.1em', marginRight: 4 }}>VEL</span>
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            style={{
              padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
              border: speed === s ? '1px solid #E07820' : '1px solid #20242A',
              background: speed === s ? '#1A130A' : 'transparent',
              color: speed === s ? '#E07820' : '#7E858C',
              fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: '.04em',
            }}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}
