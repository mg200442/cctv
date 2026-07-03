export type CameraStatus = 'online' | 'offline'

// Live-view "Optimizar" presets — keys match src/shared/streamPresets.json
export type StreamPresetKey = 'ahorro-max' | 'ahorro' | 'equilibrado' | 'calidad-max'

// A camera's stream override is either one of the fixed global presets, or
// 'custom' — manual width/height/fps/quality numbers (see CustomStream)
// entered per-camera instead of picking a preset. Only per-camera overrides
// can be 'custom'; the global default (Timeline's "Optimizar") always stays
// one of the fixed StreamPresetKey values.
export type CameraStreamPresetKey = StreamPresetKey | 'custom'

export interface CustomStream {
  width: number
  height: number
  q: number // ffmpeg -q:v — lower is better quality, 1 (best) to 31 (worst)
  fps: number
}

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
  motionAction?: 'record' | 'snapshot'
  streamPreset?: CameraStreamPresetKey // per-camera override; absent = inherit global preset
  customStream?: CustomStream // only meaningful when streamPreset === 'custom'
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
  snapshot?: string  // filename of the still snapshot that captured this alert (mutually exclusive with recording)
}

export interface DetectedClass {
  class: string
  score: number
  frame: string // filename of the still frame that produced this hit — servable from /detection-frames/:file
}

export interface Detection {
  name: string // recording or snapshot filename
  kind: 'recording' | 'snapshot'
  classes: DetectedClass[]
  scannedAt: string
  error?: boolean
}

export interface DetectionStatus {
  running: boolean
  done: number
  total: number
  currentFile: string | null
  startedAt: string | null
}

// Curated subset of the 80 COCO classes coco-ssd can detect — relevant to
// CCTV/security, not the full list (which includes irrelevant indoor
// objects like "toaster" or "spoon"). Shown as checkboxes in Settings.
export const DETECTION_CLASS_OPTIONS = [
  'person', 'bicycle', 'car', 'motorcycle', 'bus', 'truck',
  'dog', 'cat', 'backpack', 'handbag', 'suitcase',
] as const
