export type CameraStatus = 'online' | 'offline'

export interface AiBox {
  x: number
  y: number
  w: number
  h: number
  label: string
  kind: 'accent' | 'cyan' | 'red'
}

// Camera from the proxy server (real / configured)
export interface ServerCamera {
  id: string
  label: string
  zone: string
  rtsp: string
  enabled: boolean
  motionEnabled?: boolean
  streaming: boolean
  live: boolean
  recording: boolean
  motionActive: boolean
}

// Extended camera for the UI grid (includes demo metadata)
export interface Camera extends ServerCamera {
  // UI-only demo scene data (shown when no stream is available)
  scene: string
  boxes: AiBox[]
  offline?: boolean
  fps?: string
}

export interface Alert {
  id: string
  cameraId: string
  time: string
  ts: string // full ISO timestamp — used for accurate timeline positioning across day boundaries
  cam: string
  zone: string
  type: string
  sev: string
  icon: string
  tone: 'red' | 'amber' | 'cyan' | 'green'
  recording?: string // filename of the recording that captured this alert, if any
}
