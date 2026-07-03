import type { CameraStreamPresetKey, CustomStream } from '@/types/camera'
import streamPresets from './streamPresets.json'

// Shared by CameraCard's per-camera "CALIDAD" menu and Timeline's global
// "OPTIMIZAR" summary, so both describe a camera's effective stream setting
// the same way — including the 'custom' case, which isn't in
// streamPresets.presets and would throw if looked up there directly.
export function streamPresetLabel(streamPreset: CameraStreamPresetKey | undefined, customStream?: CustomStream): string {
  if (!streamPreset) return 'GLOBAL'
  if (streamPreset === 'custom') {
    return customStream
      ? `PERSONALIZADO (${customStream.width}×${customStream.height} · ${customStream.fps}fps)`
      : 'PERSONALIZADO'
  }
  return streamPresets.presets[streamPreset]?.label ?? streamPreset
}
