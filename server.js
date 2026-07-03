import express from 'express'
import cors from 'cors'
import { spawn, execSync, exec } from 'child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, unlinkSync, statSync, rmSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'
import net from 'net'
import os from 'os'
import crypto from 'crypto'
import ffmpegStatic from 'ffmpeg-static'
import jpeg from 'jpeg-js'
import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

const execAsync = promisify(exec)

const __dirname = dirname(fileURLToPath(import.meta.url))

// Loads .env into process.env if present (e.g. TELEGRAM_BOT_TOKEN/CHAT_ID) —
// native Node API (22+), no dotenv dependency needed. Silently a no-op if
// the file doesn't exist, which is the default/expected state — nothing in
// this project REQUIRES a .env, it's just a convenience over always passing
// env vars inline on the command line. .env is gitignored; never commit
// real secrets into it. See .env.example for the expected keys.
try { process.loadEnvFile(join(__dirname, '.env')) } catch {}

const PORT = process.env.PORT || 3001
// Lets tests (see tests/) point all persisted state at a throwaway temp
// directory instead of this project's real cameras.json/recordings/etc —
// defaults to __dirname so normal usage is unaffected.
const DATA_DIR = process.env.CCTV_DATA_DIR || __dirname
const RECORDINGS_DIR = join(DATA_DIR, 'recordings')
const SNAPSHOTS_DIR = join(DATA_DIR, 'snapshots')
const DETECTION_FRAMES_DIR = join(DATA_DIR, 'detection-frames')
const CONFIG_FILE = join(DATA_DIR, 'cameras.json')
const ALERTS_FILE = join(DATA_DIR, 'alerts.json')
const DETECTIONS_FILE = join(DATA_DIR, 'detections.json')
const SETTINGS_FILE = join(DATA_DIR, 'settings.json')

// Single source of truth for the live-view "Optimizar" presets, shared with
// the frontend (imported directly via the @/ alias) — this is bundled app
// code, not per-deployment data, so it's read from __dirname, not DATA_DIR.
const { presets: STREAM_PRESETS, default: DEFAULT_STREAM_PRESET } =
  JSON.parse(readFileSync(join(__dirname, 'src/shared/streamPresets.json'), 'utf8'))

mkdirSync(RECORDINGS_DIR, { recursive: true })
mkdirSync(SNAPSHOTS_DIR, { recursive: true })
mkdirSync(DETECTION_FRAMES_DIR, { recursive: true })

// --- ffmpeg resolution (portable across machines/OSes) ---
// Order: explicit override → bundled static binary (ffmpeg-static, matches
// this OS/arch automatically) → ffmpeg already on PATH.
function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH
  }
  if (ffmpegStatic && existsSync(ffmpegStatic)) {
    return ffmpegStatic
  }
  try {
    const cmd = process.platform === 'win32' ? 'where ffmpeg' : 'command -v ffmpeg'
    const found = execSync(cmd, { shell: process.platform === 'win32' ? undefined : '/bin/sh' })
      .toString().trim().split('\n')[0]
    if (found && existsSync(found)) return found
  } catch {}
  throw new Error(
    'ffmpeg no encontrado. Instálalo (p.ej. `brew install ffmpeg` / `apt install ffmpeg`) ' +
    'o define FFMPEG_PATH apuntando al binario.'
  )
}

const FFMPEG = resolveFfmpeg()
console.log(`  ffmpeg: ${FFMPEG}`)

// --- Optional hardware-accelerated decode for the live-view transcode ---
// Off by default, opt-in via FFMPEG_HWACCEL — measured on this machine with
// the bundled ffmpeg-static build (which does have `videotoolbox` compiled
// in, confirmed via `ffmpeg -hwaccels`) and it was NOT a reliable win: two
// back-to-back A/B runs against the same live camera gave contradictory
// results (one run hwaccel was ~40% *more* CPU, another ~25% less) — under
// this machine's actual load (3 concurrent streams + motion detection
// already running) the measurement is too noisy to trust, and the
// `-vf scale=...` software filter after a hardware decode forces a
// hw-surface→system-memory copy every frame that can offset or exceed the
// decode-side savings. Rather than gamble a regression on a change that's
// hard to verify live, this stays a manual, per-deployment toggle: set
// FFMPEG_HWACCEL=videotoolbox (macOS) once you can A/B it under real load
// with the machine otherwise idle, or FFMPEG_HWACCEL=vaapi (Linux, needs a
// real /dev/dri render node — set FFMPEG_HWACCEL_DEVICE to override the
// default /dev/dri/renderD128) once the target Linux hardware/drivers are
// known. Unset/invalid values are a no-op (plain software decode, today's
// behavior).
function resolveHwaccelArgs() {
  const mode = process.env.FFMPEG_HWACCEL
  if (!mode || mode === 'none') return []
  if (mode === 'vaapi') {
    const device = process.env.FFMPEG_HWACCEL_DEVICE || '/dev/dri/renderD128'
    // Deliberately NOT setting -hwaccel_output_format vaapi: that keeps
    // frames as opaque hardware surfaces, which the existing software
    // `-vf scale=...` filter downstream can't touch without an explicit
    // scale_vaapi/hwdownload rework. Omitting it makes ffmpeg decode on the
    // GPU but auto-copy frames back to system memory, so the rest of the
    // pipeline (scale/mjpeg encode) keeps working unchanged — less than the
    // full zero-copy win, but doesn't require hardware I can't test against.
    return ['-hwaccel', 'vaapi', '-hwaccel_device', device]
  }
  return ['-hwaccel', mode]
}
const HWACCEL_ARGS = resolveHwaccelArgs()
if (HWACCEL_ARGS.length) console.log(`  ffmpeg hwaccel: ${process.env.FFMPEG_HWACCEL}`)

// --- Auto network alias setup (macOS only) ---
// The camera lives on an isolated subnet reachable only via a specific
// network interface that needs an IP alias on it (see README). This is a
// macOS-specific ifconfig/osascript trick; on Linux configure the
// equivalent with `ip addr add`, or set CCTV_SKIP_NET_SETUP=1 and do it
// yourself (systemd unit, netplan, etc).
const NET_IFACE = process.env.CCTV_NET_IFACE || 'en0'
const NET_ALIASES = (process.env.CCTV_NET_ALIASES || '192.168.138.100,192.168.138.1').split(',')

// Read-only check — no side effects, safe to call from a status-polling
// endpoint. Uses execAsync (not execSync): this is hit every ~20s by every
// open dashboard tab, and a blocking child-process spawn on that cadence was
// stalling the whole Node event loop long enough to visibly delay unrelated
// requests (e.g. PATCH /api/cameras/:id for pausing a camera) — confirmed as
// the cause of "pausar todo doesn't pause anything" / "pausing one camera
// takes forever" reports.
async function isNetworkAliasActive() {
  if (process.platform !== 'darwin') return true // not our problem to detect on Linux
  try {
    const { stdout } = await execAsync(`ifconfig ${NET_IFACE} 2>/dev/null`)
    return stdout.includes(NET_ALIASES[0])
  } catch {
    return false
  }
}

// Returns { ok, message } instead of throwing — callable both at startup and
// on-demand from POST /api/network/repair (the dashboard "Reparar red" button).
// Uses execAsync (not execSync) so a pending admin-password GUI prompt (up to
// 30s) doesn't block the Node event loop — the server keeps serving snapshots
// while it waits.
async function setupNetworkAliases() {
  if (process.env.CCTV_SKIP_NET_SETUP === '1') {
    const message = 'Network alias setup skipped (CCTV_SKIP_NET_SETUP=1)'
    console.log(`  ${message}`)
    return { ok: true, skipped: true, message }
  }
  if (process.platform !== 'darwin') {
    const message = `Network alias setup skipped (only implemented for macOS). If the camera is on an isolated subnet, configure it manually, e.g.: sudo ip addr add ${NET_ALIASES[0]}/24 dev <iface>`
    console.log(`  ${message}`)
    return { ok: true, skipped: true, message }
  }
  try {
    if (await isNetworkAliasActive()) {
      console.log('  ✓ Network aliases already active')
      return { ok: true, message: 'Alias de red ya activo' }
    }
    const ALIAS_CMD = NET_ALIASES.map(ip => `ifconfig ${NET_IFACE} alias ${ip} netmask 255.255.255.0`).join(' && ')
    try {
      await execAsync(`sudo -n sh -c '${ALIAS_CMD}'`, { timeout: 5000 })
      console.log('  ✓ Network aliases set (sudo)')
      return { ok: true, message: 'Alias de red configurado (sudo)' }
    } catch {
      console.log('  Setting up camera subnet aliases (one-time admin prompt)…')
      await execAsync(
        `osascript -e 'do shell script "${ALIAS_CMD}" with administrator privileges'`,
        { timeout: 30000 }
      )
      console.log('  ✓ Network aliases set')
      return { ok: true, message: 'Alias de red configurado' }
    }
  } catch (e) {
    const message = 'Network alias setup failed (camera may be unreachable)'
    console.log(`  ✗ ${message}`)
    return { ok: false, message }
  }
}

await setupNetworkAliases()

// --- Camera config persistence ---
function loadConfig() {
  if (!existsSync(CONFIG_FILE)) {
    const defaults = [
      {
        id: 'cam-01', label: 'CAM 01', zone: 'Entrada Principal',
        rtsp: 'rtsp://admin:admin@192.168.138.3:554/video1',
        enabled: true,
      },
    ]
    writeFileSync(CONFIG_FILE, JSON.stringify(defaults, null, 2))
  }
  return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
}

function saveConfig(cameras) {
  writeFileSync(CONFIG_FILE, JSON.stringify(cameras, null, 2))
}

// --- Alerts persistence (real motion-detection events) ---
const MAX_ALERTS = 200 // cap so the file doesn't grow unbounded

function loadAlerts() {
  if (!existsSync(ALERTS_FILE)) return []
  try {
    return JSON.parse(readFileSync(ALERTS_FILE, 'utf8'))
  } catch {
    return []
  }
}

function addAlert(alert) {
  const alerts = loadAlerts()
  alerts.unshift(alert) // newest first
  if (alerts.length > MAX_ALERTS) alerts.length = MAX_ALERTS
  writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2))
  return alerts
}

// --- Telegram alert notifications (optional — off unless configured) ---
// Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (see CLAUDE.md for how to get
// them from @BotFather) to get a photo pushed to Telegram on every motion
// alert. Uses Node's built-in fetch/FormData/Blob (Node 18+) — no extra
// dependency needed just for this.
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID
const TELEGRAM_ENABLED = !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
if (TELEGRAM_ENABLED) console.log('  Telegram alerts: enabled')

// Fire-and-forget on purpose — the caller is inside the per-camera motion
// tick loop, and a slow/failing Telegram API call must never stall or break
// motion detection for this or any other camera. Errors are logged, not
// thrown. `MOTION_COOLDOWN_MS` (60s/camera) already caps how often this can
// fire, so there's no extra rate-limiting needed here.
function sendTelegramAlert(jpegBuffer, caption) {
  if (!TELEGRAM_ENABLED || !jpegBuffer) return
  const form = new FormData()
  form.append('chat_id', TELEGRAM_CHAT_ID)
  form.append('caption', caption)
  form.append('photo', new Blob([jpegBuffer], { type: 'image/jpeg' }), 'alert.jpg')
  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: form })
    .then(async res => {
      if (!res.ok) console.error(`  ✗ Telegram alert failed (${res.status}):`, await res.text())
    })
    .catch(e => console.error('  ✗ Telegram alert failed:', e.message))
}

// --- Active stream processes ---
// entry: { proc, clients, latestFrame, lastFrameTime, lastRequestTime }
const streams = new Map()
const recordings = new Map()

const STALE_FRAME_MS = 3000  // serve 503 if last frame is older than this

// Bounds for a per-camera manual override (camera.customStream) — same
// range the ffmpeg -vf scale/-q:v/-r args below can sanely take. Shared by
// the validator in PATCH /api/cameras/:id and effectiveStreamPreset's
// defensive re-check below.
const CUSTOM_STREAM_BOUNDS = { width: [160, 3840], height: [120, 2160], q: [1, 31], fps: [1, 30] }
function isValidCustomStream(c) {
  return !!c && typeof c === 'object' && ['width', 'height', 'q', 'fps'].every(k => {
    const [min, max] = CUSTOM_STREAM_BOUNDS[k]
    return Number.isFinite(c[k]) && c[k] >= min && c[k] <= max
  })
}

// Resolves which stream settings apply to this camera's live view: a
// per-camera override wins if set and still valid — either one of the 4
// fixed presets, or manual customStream numbers ("PERSONALIZADO" in
// CameraCard's CALIDAD menu) — otherwise falls back to the global setting.
// Only read at stream-spawn time (see getOrStartStream) — changing it
// doesn't affect an already-running process.
function effectiveStreamPreset(camera) {
  if (camera.streamPreset === 'custom' && isValidCustomStream(camera.customStream)) {
    return camera.customStream
  }
  const key = camera.streamPreset && STREAM_PRESETS[camera.streamPreset]
    ? camera.streamPreset
    : loadSettings().streamPreset
  return STREAM_PRESETS[key] ?? STREAM_PRESETS[DEFAULT_STREAM_PRESET]
}

function getOrStartStream(camera) {
  if (streams.has(camera.id)) return streams.get(camera.id)

  const entry = { proc: null, clients: new Set(), latestFrame: null, lastFrameTime: 0, lastRequestTime: Date.now(), startedAt: Date.now() }

  const preset = effectiveStreamPreset(camera)
  const args = [
    '-loglevel', 'quiet',
    ...HWACCEL_ARGS, // no-op unless FFMPEG_HWACCEL is set — see resolveHwaccelArgs()
    '-rtsp_transport', 'tcp',
    '-i', camera.rtsp,
    '-vf', `scale=${preset.width}:${preset.height}`,
    '-q:v', String(preset.q),
    '-r', String(preset.fps),
    '-f', 'mjpeg',
    'pipe:1',
  ]

  const proc = spawn(FFMPEG, args)
  entry.proc = proc
  proc.on('error', (err) => {
    console.error(`  ✗ ffmpeg failed to start for ${camera.id}:`, err.message)
    streams.delete(camera.id)
  })

  // Parse raw MJPEG pipe: detect complete JPEG frames (SOI…EOI)
  const SOI = Buffer.from([0xff, 0xd8])
  const EOI = Buffer.from([0xff, 0xd9])
  let buf = Buffer.alloc(0)

  proc.stdout.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk])

    let start = 0
    while (true) {
      const sIdx = buf.indexOf(SOI, start)
      if (sIdx === -1) break
      const eIdx = buf.indexOf(EOI, sIdx + 2)
      if (eIdx === -1) break

      const frame = buf.slice(sIdx, eIdx + 2)
      // Cache latest frame for snapshot polling
      entry.latestFrame = frame
      entry.lastFrameTime = Date.now()

      // Also push to any MJPEG stream clients (Chrome/Firefox)
      if (entry.clients.size > 0) {
        const header = Buffer.from(
          `--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`
        )
        const packet = Buffer.concat([header, frame, Buffer.from('\r\n')])
        for (const res of entry.clients) {
          try { res.write(packet) } catch (_) {}
        }
      }
      start = eIdx + 2
    }
    buf = buf.slice(start)
  })

  proc.on('close', () => {
    streams.delete(camera.id)
    for (const res of entry.clients) {
      try { res.end() } catch (_) {}
    }
  })

  streams.set(camera.id, entry)
  return entry
}

function stopStream(id) {
  const entry = streams.get(id)
  if (!entry) return
  try { entry.proc.kill('SIGKILL') } catch (_) {}
  streams.delete(id)
}

// --- Idle stream sweep ---
// /snapshot/:id (what every dashboard tile actually uses, via SnapshotStream.tsx
// polling every 150ms) starts ffmpeg via getOrStartStream() but never stopped
// it — unlike /stream/:id, which has its own 5s-after-last-client grace stop.
// Without this sweep, an ffmpeg process stays resident forever once any tile
// has loaded once, even with the dashboard tab closed. getOrStartStream()
// already restarts transparently on the next request, so stopping here is
// invisible to anyone actively viewing — it only reclaims CPU from cameras
// nobody is polling anymore.
const IDLE_SWEEP_INTERVAL_MS = 20_000
const IDLE_STOP_MS = 45_000

setInterval(() => {
  const now = Date.now()
  for (const [id, entry] of streams) {
    if (entry.clients.size > 0) continue // active /stream (MJPEG) client — never idle-stop
    if (now - entry.lastRequestTime < IDLE_STOP_MS) continue // requested recently — still in use
    console.log(`  Idle sweep: stopping ${id} (no requests for >${IDLE_STOP_MS}ms)`)
    stopStream(id)
  }
}, IDLE_SWEEP_INTERVAL_MS)

// --- Motion detection ---
// Frame-differencing motion detector (not object classification — that's a
// planned follow-up). Reuses the same ffmpeg pipe already kept alive for the
// live-view snapshot feature (getOrStartStream): each tick grabs the camera's
// latestFrame, downscales it to a tiny grayscale image in plain JS (the full
// 1280x720 frame is FAR too slow to run through tfjs's pure-JS backend on
// this machine — measured ~6s per op — so we shrink it with a manual pixel
// loop first, then hand the already-tiny array to tf.js for the actual diff/
// threshold math), and compares it against the previous tick's frame.
//
// False-positive mitigations (this was explicitly requested — cheap camera
// sensors + JPEG compression both add noise that a naive per-pixel diff
// would misread as motion):
//   1. Downscale to MOTION_W x MOTION_H grayscale before comparing — this
//      alone smooths out single-pixel sensor noise and compression blocking.
//   2. Per-pixel threshold (MOTION_DIFF_THRESHOLD) — ignores subtle lighting
//      drift/flicker that changes every pixel a little without anything
//      actually moving.
//   3. Percentage-of-changed-pixels threshold (MOTION_PCT_THRESHOLD) —
//      requires a meaningfully-sized change (like a person), not a small
//      noisy blob.
//   4. Tile-based spatial check (see analyzeMotion) — distinguishes a global
//      scene event (exposure/IR flicker changes EVERY tile) from real
//      motion (changes some tiles, leaves others — background — alone),
//      regardless of the overall %. A person standing close to the camera
//      can legitimately change 50%+ of the frame; a blunt percentage
//      ceiling was rejecting that as "not motion" (reported by the user:
//      standing in front of cam-01 didn't reliably alert).
//   5. Per-camera cooldown (MOTION_COOLDOWN_MS) — one alert per motion
//      "event", not a new alert every tick while someone's still in frame.
const MOTION_W = 96
const MOTION_H = 54
const MOTION_CHECK_INTERVAL_MS = 1500
const MOTION_DIFF_THRESHOLD = 25      // 0-255 grayscale levels
const MOTION_PCT_THRESHOLD = 1.5      // % of pixels that must exceed the diff threshold
// Spatial grid used to tell "something moved in part of the frame" apart
// from "the whole frame changed together" (lighting/IR flicker), regardless
// of how large the moving thing is. MOTION_H/TILES_Y and MOTION_W/TILES_X
// must divide evenly (54/3=18, 96/4=24).
const TILES_X = 4
const TILES_Y = 3
const TILE_HOT_PCT = 12          // a tile counts as "hot" if >=this % of its pixels changed
const GLOBAL_HOT_TILE_RATIO = 0.85 // >=85% of tiles hot at once = global change, not localized motion
const MOTION_STREAK_REQUIRED = 1      // ticks over threshold before alerting (cooldown prevents spam)
const MOTION_COOLDOWN_MS = 60_000     // min gap between alerts for the same camera
const MOTION_ACTIVE_DECAY_MS = 5_000  // how long the "motion active" UI flag lingers after the streak drops
// A freshly-(re)started ffmpeg pipe often needs a moment before the camera's
// auto-exposure/white-balance settles — comparing frames during that window
// reads as "motion" even though nothing moved. Skip comparisons (but keep
// updating the baseline) until the stream has been running this long.
const STREAM_WARMUP_MS = 4_000

let motionActive = false
const motionTimers = new Map()  // cameraId -> setTimeout handle (one independent loop per camera)
const motionState = new Map()   // cameraId -> boolean (for the UI: is motion happening right now)
const motionTrack = new Map()   // cameraId -> { prevGray, streak, lastAlertTime, lastMotionTime }
const motionRecordTimers = new Map() // cameraId -> setTimeout handle for auto-record-stop

// Decode a JPEG buffer straight to a tiny grayscale Float32Array, skipping
// tfjs entirely for this part — plain typed-array math is what's actually
// fast here (see comment above).
//
// Downscales by AVERAGING each source block, not nearest-neighbor sampling.
// This matters a lot in practice: nearest-neighbor picks one raw pixel per
// output pixel, which keeps 100% of per-pixel sensor noise intact — and
// these cameras are noisy at night (IR/low-light grain). Measured live: a
// fully static night scene read as ~58% of pixels "changed" with
// nearest-neighbor sampling, because the noise survived the downscale.
// Block-averaging smooths that random per-pixel noise out while still
// preserving real, spatially-coherent motion (an object moving affects a
// whole neighborhood of pixels together, so it survives averaging).
function decodeGraySmall(jpegBuffer) {
  let decoded
  try {
    decoded = jpeg.decode(jpegBuffer, { useTArray: true })
  } catch {
    return null
  }
  const { width, height, data } = decoded
  const out = new Float32Array(MOTION_W * MOTION_H)
  const blockW = width / MOTION_W
  const blockH = height / MOTION_H
  for (let y = 0; y < MOTION_H; y++) {
    const y0 = Math.floor(y * blockH)
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * blockH))
    for (let x = 0; x < MOTION_W; x++) {
      const x0 = Math.floor(x * blockW)
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * blockW))
      let sum = 0
      let count = 0
      for (let sy = y0; sy < y1; sy++) {
        let rowIdx = (sy * width + x0) * 4
        for (let sx = x0; sx < x1; sx++) {
          sum += 0.299 * data[rowIdx] + 0.587 * data[rowIdx + 1] + 0.114 * data[rowIdx + 2]
          rowIdx += 4
          count++
        }
      }
      out[y * MOTION_W + x] = sum / count
    }
  }
  return out
}

// tf.js does the actual comparison — this is the part that's genuinely fast
// once the inputs are already tiny. Returns both the overall changed-pixel
// percentage AND the tile hot-ratio used to tell localized motion apart
// from a uniform global scene change (see comment block above).
function analyzeMotion(prevGray, currGray) {
  return tf.tidy(() => {
    const a = tf.tensor(prevGray, [MOTION_H, MOTION_W])
    const b = tf.tensor(currGray, [MOTION_H, MOTION_W])
    const changed = tf.sub(a, b).abs().greater(MOTION_DIFF_THRESHOLD).toFloat()
    const pct = changed.mean().dataSync()[0] * 100
    const tileMeans = changed
      .reshape([TILES_Y, MOTION_H / TILES_Y, TILES_X, MOTION_W / TILES_X])
      .mean([1, 3])
      .dataSync()
    let hotTiles = 0
    for (let i = 0; i < tileMeans.length; i++) {
      if (tileMeans[i] * 100 >= TILE_HOT_PCT) hotTiles++
    }
    return { pct, hotRatio: hotTiles / tileMeans.length }
  })
}

// One independent tick for a single camera — pulled out of the old shared
// loop so a slow camera can't delay how often another camera gets checked
// (measured: block-averaged decoding takes ~450-900ms per camera; with 3
// cameras sharing one serial loop, a given camera was only actually being
// re-checked every ~3-4s despite the "1.5s" interval, which was part of why
// real motion in front of a camera wasn't always caught in time).
async function motionTickForCamera(camera) {
  const entry = getOrStartStream(camera)
  const now = Date.now()
  entry.lastRequestTime = now // keep the stream alive while we're watching it

  if (!motionTrack.has(camera.id)) {
    motionTrack.set(camera.id, { prevGray: null, streak: 0, lastAlertTime: 0, lastMotionTime: 0 })
  }
  const track = motionTrack.get(camera.id)

  const hasFreshFrame = entry.latestFrame && (now - entry.lastFrameTime) < STALE_FRAME_MS
  const isWarm = (now - entry.startedAt) >= STREAM_WARMUP_MS
  if (!hasFreshFrame) return

  const gray = decodeGraySmall(entry.latestFrame)
  if (gray && track.prevGray && isWarm) {
    const { pct, hotRatio } = analyzeMotion(track.prevGray, gray)
    if (hotRatio >= GLOBAL_HOT_TILE_RATIO) {
      // Change is spread across nearly every tile — a global scene event
      // (exposure/IR flicker), not an object moving through part of the
      // frame. Confirmed via direct frame inspection this really happens on
      // some cameras. Accept as new baseline below, don't count as motion.
      if (now - (track.lastSceneResetLog || 0) > 30_000) {
        console.log(`  Motion: scene reset for ${camera.id} (${pct.toFixed(1)}% changed, ${(hotRatio * 100).toFixed(0)}% of tiles — treated as non-motion global change, e.g. exposure/IR flicker)`)
        track.lastSceneResetLog = now
      }
      track.streak = 0
    } else if (pct > MOTION_PCT_THRESHOLD) {
      track.streak++
    } else {
      track.streak = 0
    }

    if (track.streak >= MOTION_STREAK_REQUIRED) {
      motionState.set(camera.id, true)
      track.lastMotionTime = now
      if (now - track.lastAlertTime > MOTION_COOLDOWN_MS) {
        track.lastAlertTime = now
        const d = new Date()
        const pad2 = n => String(n).padStart(2, '0')
        // Per-camera choice of what motion detection does when it fires:
        // record a video clip (default, existing behavior) or just save a
        // still snapshot — cheaper, and enough for cameras where a full
        // clip isn't needed.
        const useSnapshot = camera.motionAction === 'snapshot'
        const recordingFile = useSnapshot ? null : autoRecordOnMotion(camera)
        const snapshotFile = useSnapshot ? saveMotionSnapshot(camera, entry) : null
        addAlert({
          id: `${camera.id}_${d.getTime()}`,
          cameraId: camera.id,
          time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`,
          ts: d.toISOString(),
          cam: camera.label,
          zone: camera.zone,
          type: 'Movimiento detectado',
          sev: 'BAJA',
          icon: 'radar',
          tone: 'cyan',
          recording: recordingFile,
          snapshot: snapshotFile,
        })
        console.log(`  Motion: alert for ${camera.id} (${pct.toFixed(1)}% changed)`)
        // entry.latestFrame is the current live JPEG frame — available
        // regardless of whether this camera's motionAction is "record" or
        // "snapshot", so Telegram always gets a photo immediately instead
        // of waiting on a video to finish.
        sendTelegramAlert(
          entry.latestFrame,
          `🚨 Movimiento detectado\n${camera.label} · ${camera.zone || 'sin zona'}\n${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
        )
      }
    } else if (now - track.lastMotionTime > MOTION_ACTIVE_DECAY_MS) {
      motionState.set(camera.id, false)
    }
  }
  if (gray) track.prevGray = gray
}

// Self-rescheduling per-camera loop instead of setInterval: block-averaged
// decoding takes ~450-900ms, so a fixed setInterval could fire the next
// round before the current one finishes. Scheduling the next tick only
// after the current one resolves guarantees a camera's own ticks never
// overlap, without being held up by any other camera's processing time.
// `motionEnabled` defaults to true (absent = on) so existing cameras.json
// entries from before this per-camera toggle existed keep working unchanged.
// Deliberately does NOT require `camera.enabled`: "enabled" only controls
// whether the dashboard shows a live view for that camera (paused = save
// browser-side polling/rendering) — motion detection is independent of that
// and keeps running server-side even while a camera is paused, per explicit
// request (a paused camera still needs its ffmpeg stream alive for this).
function isMotionEligible(camera) {
  return !!camera && camera.motionEnabled !== false
}

// A camera's ffmpeg stream needs to stay alive if the dashboard is showing
// its live view OR motion detection is actively watching it — used to
// decide whether pausing a camera (or disabling its motion toggle) can
// actually free the CPU, versus the other consumer still needing the feed.
function streamStillNeeded(camera) {
  return camera.enabled || (motionActive && isMotionEligible(camera))
}

async function runCameraMotionLoop(cameraId) {
  if (!motionActive) { motionTimers.delete(cameraId); return }
  const camera = loadConfig().find(c => c.id === cameraId)
  if (!isMotionEligible(camera)) { motionTimers.delete(cameraId); motionState.delete(cameraId); return } // removed/disabled/excluded since detection started
  try {
    await motionTickForCamera(camera)
  } catch (e) {
    console.error(`  Motion tick error for ${cameraId}:`, e.message)
  }
  if (motionActive) {
    motionTimers.set(cameraId, setTimeout(() => runCameraMotionLoop(cameraId), MOTION_CHECK_INTERVAL_MS))
  } else {
    motionTimers.delete(cameraId)
  }
}

function startMotionDetection() {
  if (motionActive) return
  motionActive = true
  motionTrack.clear()   // fresh baseline — don't compare against a stale frame from last time
  motionState.clear()
  const cameras = loadConfig().filter(isMotionEligible)
  for (const camera of cameras) runCameraMotionLoop(camera.id)
  console.log(`  Motion detection: started (${cameras.length} camera(s))`)
}

function stopMotionDetection() {
  motionActive = false
  for (const timer of motionTimers.values()) clearTimeout(timer)
  motionTimers.clear()
  motionState.clear()
  console.log('  Motion detection: stopped')
}

// Called from PATCH /api/cameras/:id whenever `enabled` or `motionEnabled`
// changes, so flipping a per-camera switch takes effect immediately instead
// of only on the next global start/stop — lets the dashboard offer
// individual per-camera motion control alongside the existing global toggle.
function syncCameraMotionLoop(camera) {
  if (!motionActive) return
  if (isMotionEligible(camera)) {
    if (!motionTimers.has(camera.id)) runCameraMotionLoop(camera.id)
  } else {
    const timer = motionTimers.get(camera.id)
    if (timer) clearTimeout(timer)
    motionTimers.delete(camera.id)
    motionState.delete(camera.id)
  }
}

// --- App ---
const app = express()
app.use(cors())
app.use(express.json())

// --- Optional HTTP Basic Auth (off unless configured) ---
// Anyone on the same network (or who reaches this port) could otherwise
// view live cameras, delete recordings, control motion detection, etc. —
// no login of any kind existed before this. Set AUTH_USER + AUTH_PASS
// (.env, same pattern as TELEGRAM_*/FFMPEG_HWACCEL) to require them; the
// browser's native Basic Auth prompt handles the UI, no login page needed.
// Placed before every route below, including static file serving.
const AUTH_USER = process.env.AUTH_USER
const AUTH_PASS = process.env.AUTH_PASS
const AUTH_ENABLED = !!(AUTH_USER && AUTH_PASS)
if (AUTH_ENABLED) console.log('  Auth: enabled (HTTP Basic)')

function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  // Constant-time compare needs equal-length buffers — pad instead of
  // short-circuiting on length, so a wrong-length guess isn't distinguishable
  // by timing from a right-length-wrong-content one.
  if (bufA.length !== bufB.length) return crypto.timingSafeEqual(bufA, bufA) && false
  return crypto.timingSafeEqual(bufA, bufB)
}

if (AUTH_ENABLED) {
  app.use((req, res, next) => {
    const header = req.headers.authorization || ''
    const [scheme, encoded] = header.split(' ')
    if (scheme === 'Basic' && encoded) {
      const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':')
      if (user && pass && timingSafeStringEqual(user, AUTH_USER) && timingSafeStringEqual(pass, AUTH_PASS)) {
        return next()
      }
    }
    res.set('WWW-Authenticate', 'Basic realm="SENTINEL-OPS"')
    res.status(401).send('Autenticación requerida')
  })
}

// Camera-subnet network alias status/repair — lets the dashboard fix the
// "aliases lost on reboot/logout" issue (see CLAUDE.md) with a button instead
// of a terminal/AI session.
app.get('/api/network/status', async (_req, res) => {
  res.json({ active: await isNetworkAliasActive(), platform: process.platform })
})

app.post('/api/network/repair', async (_req, res) => {
  const result = await setupNetworkAliases()
  res.json({ ...result, active: await isNetworkAliasActive() })
})

// List cameras
app.get('/api/cameras', (_req, res) => {
  const cameras = loadConfig()
  const now = Date.now()
  const withStatus = cameras.map(c => {
    const entry = streams.get(c.id)
    // "live" = actually delivering fresh frames right now, not just "not
    // paused" — a camera can be enabled but unreachable (network alias down,
    // camera off, RTSP timeout) with no active/fresh stream.
    const live = !!entry && !!entry.latestFrame && (now - entry.lastFrameTime) < STALE_FRAME_MS
    return {
      ...c,
      streaming: !!entry,
      live,
      recording: recordings.has(c.id),
      motionActive: motionState.get(c.id) ?? false,
    }
  })
  res.json(withStatus)
})

const MAX_CAMERAS = 9

// Add camera
app.post('/api/cameras', (req, res) => {
  const { label, zone, rtsp } = req.body
  if (!label || !rtsp) return res.status(400).json({ error: 'label and rtsp required' })

  const cameras = loadConfig()
  if (cameras.length >= MAX_CAMERAS) return res.status(400).json({ error: `Máximo ${MAX_CAMERAS} cámaras` })

  const id = 'cam-' + String(cameras.length + 1).padStart(2, '0')
  const camera = { id, label, zone: zone || '', rtsp, enabled: true }
  // Record the MAC at add-time as a baseline for future IP-conflict detection
  // in /api/discover (best-effort — camera may not be ARP-resolvable yet).
  const ipMatch = rtsp.match(/\b(\d+\.\d+\.\d+\.\d+)\b/)
  if (ipMatch) {
    const mac = getMac(ipMatch[1])
    if (mac) camera.mac = mac
  }
  cameras.push(camera)
  saveConfig(cameras)
  res.status(201).json(camera)
})

// Rename / update camera label & zone
app.patch('/api/cameras/:id', (req, res) => {
  const { label, zone, enabled, motionEnabled, motionAction, streamPreset, customStream } = req.body
  const cameras = loadConfig()
  const cam = cameras.find(c => c.id === req.params.id)
  if (!cam) return res.status(404).json({ error: 'Not found' })
  if (label) cam.label = label.trim()
  if (zone !== undefined) cam.zone = zone.trim()
  if (typeof enabled === 'boolean') cam.enabled = enabled
  if (typeof motionEnabled === 'boolean') cam.motionEnabled = motionEnabled
  if (motionAction === 'record' || motionAction === 'snapshot') cam.motionAction = motionAction

  // streamPreset: a preset key sets a per-camera override; null clears it
  // back to "inherit the global preset"; 'custom' requires a valid
  // customStream object (manual width/height/q/fps — "PERSONALIZADO" in
  // CameraCard's CALIDAD menu) alongside it. Anything else invalid is
  // rejected rather than silently ignored, so a typo in the UI doesn't look
  // like it "worked" and then does nothing.
  let presetChanged = false
  if (streamPreset !== undefined) {
    if (streamPreset === null) {
      if (cam.streamPreset !== undefined) { delete cam.streamPreset; presetChanged = true }
      if (cam.customStream !== undefined) { delete cam.customStream; presetChanged = true }
    } else if (streamPreset === 'custom') {
      if (!isValidCustomStream(customStream)) return res.status(400).json({ error: 'customStream inválido' })
      cam.streamPreset = 'custom'
      cam.customStream = { width: customStream.width, height: customStream.height, q: customStream.q, fps: customStream.fps }
      presetChanged = true
    } else if (STREAM_PRESETS[streamPreset]) {
      if (cam.streamPreset !== streamPreset) { cam.streamPreset = streamPreset; presetChanged = true }
      if (cam.customStream !== undefined) { delete cam.customStream; presetChanged = true }
    } else {
      return res.status(400).json({ error: 'streamPreset inválido' })
    }
  }

  saveConfig(cameras)
  if (typeof enabled === 'boolean' || typeof motionEnabled === 'boolean') {
    // Free CPU immediately when nothing needs this camera's stream anymore
    // — don't wait for the idle sweep, which is for "nobody has the
    // dashboard open", not "open but paused on purpose". But don't kill it
    // just because the dashboard paused it if motion detection is still
    // watching this camera — pausing only means "no live view", not "stop
    // detecting motion" (that's the separate per-camera motion toggle).
    if (!streamStillNeeded(cam)) stopStream(cam.id)
    syncCameraMotionLoop(cam)
  }
  // Force the live-view ffmpeg process to respawn with the new preset's
  // args on the next request — same stop-and-let-getOrStartStream-respawn
  // mechanism the idle sweep relies on. Unlike the branch above, this
  // always stops (even if the stream is still needed) because we want an
  // immediate respawn, not just a stop.
  if (presetChanged) stopStream(cam.id)
  res.json(cam)
})

// Delete camera
app.delete('/api/cameras/:id', (req, res) => {
  stopStream(req.params.id)
  const cameras = loadConfig().filter(c => c.id !== req.params.id)
  saveConfig(cameras)
  res.json({ ok: true })
})

// MJPEG stream endpoint
app.get('/stream/:id', (req, res) => {
  const cameras = loadConfig()
  const camera = cameras.find(c => c.id === req.params.id)
  if (!camera) return res.status(404).send('Camera not found')
  if (!camera.enabled) return res.status(503).send('Camera disabled')

  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const entry = getOrStartStream(camera)
  entry.lastRequestTime = Date.now()
  entry.clients.add(res)

  req.on('close', () => {
    entry.clients.delete(res)
    // If no more clients, stop the ffmpeg process after a grace period
    setTimeout(() => {
      if (entry.clients.size === 0) stopStream(camera.id)
    }, 5000)
  })
})

// Snapshot endpoint — returns the latest JPEG frame (works in all browsers, including Safari)
app.get('/snapshot/:id', (req, res) => {
  const cameras = loadConfig()
  const camera = cameras.find(c => c.id === req.params.id)
  if (!camera) return res.status(404).send('Camera not found')
  if (!camera.enabled) return res.status(503).send('Camera disabled')

  const entry = getOrStartStream(camera)
  entry.lastRequestTime = Date.now()

  // If we have a frame, return it — but only if it's fresh (camera still connected)
  if (entry.latestFrame) {
    if (Date.now() - entry.lastFrameTime > STALE_FRAME_MS) {
      return res.status(503).send('Stream stale')
    }
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.send(entry.latestFrame)
  }

  // Wait up to 4s for the first frame. Guarded against the race where the
  // deadline fires and responds 503 right as a frame arrives — without the
  // headersSent check, the interval would try to send a second response
  // and crash the whole process with ERR_HTTP_HEADERS_SENT (this happened
  // in practice with a freshly-added camera whose first frame took just
  // over 4s to arrive).
  const deadline = setTimeout(() => {
    clearInterval(check)
    if (!res.headersSent) res.status(503).send('No frame yet')
  }, 4000)

  const check = setInterval(() => {
    if (entry.latestFrame && !res.headersSent) {
      clearInterval(check)
      clearTimeout(deadline)
      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.send(entry.latestFrame)
    }
  }, 50)
})

// Start recording for a camera. `auto: true` marks it as motion-triggered,
// so the auto-record-stop timer (see autoRecordOnMotion) knows it's allowed
// to stop this one later — a manually-started recording (auto: false) is
// never touched by the motion system.
function startRecordingForCamera(camera, { auto = false } = {}) {
  if (recordings.has(camera.id)) return recordings.get(camera.id).file

  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  const ts = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  const file = join(RECORDINGS_DIR, `${camera.id}_${ts}.mp4`)

  const args = [
    '-loglevel', 'quiet',
    '-rtsp_transport', 'tcp',
    '-i', camera.rtsp,
    // Stream-copy the VIDEO (remux, no decode/encode) — the camera's native
    // H.265 written straight into the MP4 container. Recording used to
    // re-encode to H.264 via libx264, which doubled CPU cost on top of the
    // live-view transcode while REC was on. HEVC-in-MP4 plays natively in
    // Safari (this project's primary target); Chrome/Firefox HEVC support
    // is inconsistent — accepted tradeoff, see CLAUDE.md.
    // Audio still gets a cheap transcode to AAC: the camera sends PCM A-law,
    // which MP4's muxer rejects outright with `-c copy` ("codec not
    // currently supported in container") — confirmed by testing. Audio
    // encode is computationally trivial next to video, so this keeps
    // ~all the CPU win while avoiding a broken/empty output file.
    '-c:v', 'copy',
    // The camera's raw HEVC bitstream gets muxed with the `hev1` fourcc by
    // default (parameter sets in-band). Safari's native <video> playback of
    // HEVC-in-MP4 is unreliable with `hev1` — confirmed: recordings decoded
    // cleanly with ffmpeg but Safari showed a "can't play" icon and refused
    // to load them. Forcing the `hvc1` tag (parameter sets in the hvcC box,
    // Apple's preferred variant) fixes Safari playback — this only rewrites
    // container-level metadata, still zero-decode stream copy, no CPU cost.
    '-tag:v', 'hvc1',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    file,
  ]

  const proc = spawn(FFMPEG, args)
  recordings.set(camera.id, { proc, file, auto })

  proc.on('error', (err) => {
    console.error(`  ✗ ffmpeg recording failed to start for ${camera.id}:`, err.message)
    recordings.delete(camera.id)
  })
  proc.on('close', () => recordings.delete(camera.id))

  return file
}

function stopRecordingForCamera(id) {
  const rec = recordings.get(id)
  if (!rec) return null
  try { rec.proc.kill('SIGINT') } catch (_) {} // SIGINT triggers clean finalization
  setTimeout(() => recordings.delete(id), 2000)
  return rec.file
}

// Called right after a motion alert fires. Starts a recording if the camera
// isn't already recording, or — if it's already auto-recording — extends
// the auto-stop window instead of letting it end: "record 20s, and if more
// alerts fire during that time, keep recording" (as requested), by just
// pushing the stop-timer back out each time a new alert comes in. A
// manually-started recording (REC button) is left completely alone.
const MOTION_RECORD_DURATION_MS = 20_000

// Returns the filename (not full path) of whatever recording is now covering
// this motion event, so the caller can stamp it onto the alert — lets the
// dashboard link straight from "ALERTAS EN VIVO" to the clip that captured it.
// Saves the camera's current live frame as a JPEG — the "snapshot" motion
// action, an alternative to auto-recording video for cameras/situations
// where a still image is enough (cheaper on disk, nothing to finalize).
function saveMotionSnapshot(camera, entry) {
  if (!entry.latestFrame) return null
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  const ts = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  const name = `${camera.id}_${ts}.jpg`
  try {
    writeFileSync(join(SNAPSHOTS_DIR, name), entry.latestFrame)
    console.log(`  Motion: snapshot saved for ${camera.id}`)
    return name
  } catch (e) {
    console.error(`  ✗ Failed to save motion snapshot for ${camera.id}:`, e.message)
    return null
  }
}

function autoRecordOnMotion(camera) {
  const active = recordings.get(camera.id)
  if (active && !active.auto) return basename(active.file) // manual recording — don't touch it, but it's still covering this moment

  if (!active) {
    startRecordingForCamera(camera, { auto: true })
    console.log(`  Motion: auto-recording started for ${camera.id} (${MOTION_RECORD_DURATION_MS / 1000}s, extends on repeat alerts)`)
  }

  if (motionRecordTimers.has(camera.id)) clearTimeout(motionRecordTimers.get(camera.id))
  motionRecordTimers.set(camera.id, setTimeout(() => {
    stopRecordingForCamera(camera.id)
    motionRecordTimers.delete(camera.id)
    console.log(`  Motion: auto-recording stopped for ${camera.id} (${MOTION_RECORD_DURATION_MS / 1000}s since last alert)`)
  }, MOTION_RECORD_DURATION_MS))

  return basename(recordings.get(camera.id).file)
}

// Start recording
app.post('/api/cameras/:id/record/start', (req, res) => {
  const camera = loadConfig().find(c => c.id === req.params.id)
  if (!camera) return res.status(404).json({ error: 'Camera not found' })
  const file = startRecordingForCamera(camera)
  res.json({ ok: true, file })
})

// Stop recording
app.post('/api/cameras/:id/record/stop', (req, res) => {
  // A manual stop always wins, even over an auto-recording — cancel any
  // pending auto-stop timer so it doesn't try to act on an already-gone process.
  if (motionRecordTimers.has(req.params.id)) {
    clearTimeout(motionRecordTimers.get(req.params.id))
    motionRecordTimers.delete(req.params.id)
  }
  const file = stopRecordingForCamera(req.params.id)
  res.json({ ok: true, file: file ?? undefined })
})

// List recordings (includes file size)
app.get('/api/recordings', (_req, res) => {
  try {
    const files = readdirSync(RECORDINGS_DIR)
      .filter(f => f.endsWith('.mp4'))
      .sort()
      .map(f => {
        const { size } = statSync(join(RECORDINGS_DIR, f))
        return { name: f, size }
      })
    res.json(files)
  } catch {
    res.json([])
  }
})

// Recording metadata — runs ffmpeg to extract real duration (slow, call infrequently)
// name -> { duration, size } — a finished recording never changes duration,
// so once probed there's no reason to spawn ffmpeg for it again. Before this
// cache, every call here re-ran `ffmpeg -i` on EVERY recording file (every
// 30s, per open tab) with no memoization — cheap with a handful of files,
// but linear-and-unbounded as the folder grows from motion-detection
// recordings piling up over time. Keyed on size too: a still-being-recorded
// file grows, so a cache hit only counts if the size hasn't changed since
// the last probe (i.e. the file is finalized).
const recordingMetaCache = new Map()

app.get('/api/recordings/meta', async (_req, res) => {
  const files = readdirSync(RECORDINGS_DIR).filter(f => f.endsWith('.mp4')).sort()
  const meta = await Promise.all(files.map(async name => {
    const file = join(RECORDINGS_DIR, name)
    const { size } = statSync(file)
    const cached = recordingMetaCache.get(name)
    if (cached && cached.size === size) return cached
    try {
      // ffmpeg -i exits non-zero but writes file info to stderr
      await execAsync(`"${FFMPEG}" -i "${file}"`, { timeout: 5000 })
      const result = { name, duration: 0, size }
      recordingMetaCache.set(name, result)
      return result
    } catch (e) {
      const stderr = (e && typeof e === 'object' && 'stderr' in e) ? String(e.stderr) : ''
      const m = stderr.match(/Duration: (\d+):(\d+):(\d+)/)
      const duration = m ? parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) : 0
      const result = { name, duration, size }
      recordingMetaCache.set(name, result)
      return result
    }
  }))
  res.json(meta)
})

// Disk usage stats for the recordings partition
app.get('/api/stats', (_req, res) => {
  let diskPercent = 0
  // Counts recordings + snapshots together — this is what actually counts
  // against maxStorageGB / the retention sweep below, so the UI's storage
  // bar should reflect the same total the cap is enforced against.
  const recordingsTotalBytes = getCapturedTotalBytes()
  try {
    const out = execSync(`df -k "${RECORDINGS_DIR}" 2>/dev/null`).toString()
    const lines = out.trim().split('\n')
    const parts = lines[lines.length - 1].trim().split(/\s+/)
    // macOS df -k: Filesystem 1024-blocks Used Available Capacity ...
    diskPercent = parseInt(parts[4]?.replace('%', '') ?? '0') || 0
  } catch {}
  res.json({ diskPercent, recordingsTotalBytes })
})

// ─── Settings (persisted server-side — needed so the storage retention
// sweep below can enforce a cap even with no browser tab open) ───────────

function loadSettings() {
  const defaults = { maxStorageGB: 10, streamPreset: DEFAULT_STREAM_PRESET }
  if (!existsSync(SETTINGS_FILE)) return defaults
  try {
    return { ...defaults, ...JSON.parse(readFileSync(SETTINGS_FILE, 'utf8')) }
  } catch {
    return defaults
  }
}

function saveSettings(settings) {
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
}

app.get('/api/settings', (_req, res) => {
  res.json(loadSettings())
})

app.put('/api/settings', (req, res) => {
  const { maxStorageGB, streamPreset } = req.body
  const settings = loadSettings()

  if (maxStorageGB !== undefined) {
    if (typeof maxStorageGB !== 'number' || !(maxStorageGB > 0)) {
      return res.status(400).json({ error: 'maxStorageGB must be a positive number' })
    }
    settings.maxStorageGB = maxStorageGB
  }

  if (streamPreset !== undefined) {
    if (!STREAM_PRESETS[streamPreset]) {
      return res.status(400).json({ error: 'streamPreset inválido' })
    }
    if (settings.streamPreset !== streamPreset) {
      settings.streamPreset = streamPreset
      // Restart only the cameras that inherit the global preset (no
      // per-camera override) — same stop-and-let-getOrStartStream-respawn
      // mechanism as everywhere else this preset changes.
      for (const cam of loadConfig()) {
        if (!cam.streamPreset && streams.has(cam.id)) stopStream(cam.id)
      }
    }
  }

  saveSettings(settings)
  res.json(settings)
})

// ─── Storage retention — auto-delete oldest recordings/snapshots once
// combined size passes maxStorageGB. Was previously just a visual 80%/95%
// warning in the UI with no actual enforcement, so disk would fill up
// unbounded from motion detection running indefinitely. ───────────────────

function getCapturedTotalBytes() {
  let total = 0
  try {
    for (const f of readdirSync(RECORDINGS_DIR)) {
      if (f.endsWith('.mp4')) total += statSync(join(RECORDINGS_DIR, f)).size
    }
  } catch {}
  try {
    for (const f of readdirSync(SNAPSHOTS_DIR)) {
      if (f.endsWith('.jpg')) total += statSync(join(SNAPSHOTS_DIR, f)).size
    }
  } catch {}
  return total
}

// Oldest-first by the timestamp encoded in the filename itself
// (`${cameraId}_${timestamp}.ext`) rather than mtime — mtime can be
// misleading (e.g. a file copied/restored later), the filename timestamp is
// the actual capture time and is how every other part of this app already
// derives "when" for a recording/snapshot (see parseRecording in
// useCameras.ts).
function fileCaptureTime(name) {
  const ts = name.replace(/\.(mp4|jpg)$/, '').split('_')[1]
  const m = ts && ts.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})$/)
  return m ? new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}`).getTime() : 0
}

const RETENTION_TARGET_RATIO = 0.9 // sweep down to 90% of the cap, not exactly 100% — avoids sweeping again almost immediately

function enforceRetention() {
  const settings = loadSettings()
  const capBytes = settings.maxStorageGB * 1024 ** 3
  let total = getCapturedTotalBytes()
  if (total <= capBytes) return { deleted: 0, freedBytes: 0 }

  const activeFiles = new Set([...recordings.values()].map(r => basename(r.file)))
  const targetBytes = capBytes * RETENTION_TARGET_RATIO

  const files = []
  try {
    for (const f of readdirSync(RECORDINGS_DIR)) {
      if (f.endsWith('.mp4') && !activeFiles.has(f)) {
        files.push({ name: f, dir: RECORDINGS_DIR, size: statSync(join(RECORDINGS_DIR, f)).size })
      }
    }
  } catch {}
  try {
    for (const f of readdirSync(SNAPSHOTS_DIR)) {
      if (f.endsWith('.jpg')) files.push({ name: f, dir: SNAPSHOTS_DIR, size: statSync(join(SNAPSHOTS_DIR, f)).size })
    }
  } catch {}
  files.sort((a, b) => fileCaptureTime(a.name) - fileCaptureTime(b.name)) // oldest first

  let deleted = 0
  let freedBytes = 0
  for (const f of files) {
    if (total <= targetBytes) break
    try {
      unlinkSync(join(f.dir, f.name))
      removeDetectionForFile(f.name)
      if (f.dir === RECORDINGS_DIR) recordingMetaCache.delete(f.name)
      total -= f.size
      freedBytes += f.size
      deleted++
    } catch {}
  }
  if (deleted > 0) console.log(`  Storage retention: freed ${(freedBytes / 1024 / 1024).toFixed(0)}MB, deleted ${deleted} file(s)`)
  return { deleted, freedBytes }
}

// Manual trigger — lets the user force a cleanup right away from the
// dashboard instead of waiting for the periodic sweep, and gives tests a
// way to exercise this without waiting on a timer.
app.post('/api/storage/enforce', (_req, res) => {
  res.json({ ok: true, ...enforceRetention() })
})

const RETENTION_SWEEP_INTERVAL_MS = 5 * 60_000
setInterval(enforceRetention, RETENTION_SWEEP_INTERVAL_MS)

// Delete ALL recording files at once. Skips any file a recording is
// currently writing to (manual REC or motion auto-record) — deleting out
// from under a live ffmpeg process would corrupt that in-progress file.
app.delete('/api/recordings', (_req, res) => {
  const activeFiles = new Set([...recordings.values()].map(r => basename(r.file)))
  let deleted = 0, skipped = 0
  try {
    for (const name of readdirSync(RECORDINGS_DIR)) {
      if (!name.endsWith('.mp4')) continue
      if (activeFiles.has(name)) { skipped++; continue }
      try { unlinkSync(join(RECORDINGS_DIR, name)); recordingMetaCache.delete(name); removeDetectionForFile(name); deleted++ } catch { skipped++ }
    }
  } catch {}
  res.json({ ok: true, deleted, skipped })
})

// Delete recording file (regex route avoids Express 5 dot-matching issue in :param)
app.delete(/^\/api\/recordings\/(.+)$/, (req, res) => {
  const filename = decodeURIComponent(req.params[0])
  if (!filename.endsWith('.mp4') || filename.includes('/') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' })
  }
  const file = join(RECORDINGS_DIR, filename)
  if (!existsSync(file)) return res.status(404).json({ error: 'Not found' })
  try {
    unlinkSync(file)
    recordingMetaCache.delete(filename)
    removeDetectionForFile(filename)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Could not delete file' })
  }
})

// Serve recording video files
app.get('/recordings/:file', (req, res) => {
  const file = join(RECORDINGS_DIR, req.params.file)
  if (!existsSync(file)) return res.status(404).send('Not found')
  res.sendFile(file)
})

// ─── Snapshots (motion-detection "snapshot" action — mirrors recordings) ────────

app.get('/api/snapshots', (_req, res) => {
  try {
    const files = readdirSync(SNAPSHOTS_DIR)
      .filter(f => f.endsWith('.jpg'))
      .sort()
      .map(f => {
        const { size } = statSync(join(SNAPSHOTS_DIR, f))
        return { name: f, size }
      })
    res.json(files)
  } catch {
    res.json([])
  }
})

app.get('/snapshots/:file', (req, res) => {
  const file = join(SNAPSHOTS_DIR, req.params.file)
  if (!existsSync(file)) return res.status(404).send('Not found')
  res.sendFile(file)
})

app.delete('/api/snapshots', (_req, res) => {
  let deleted = 0, skipped = 0
  try {
    for (const name of readdirSync(SNAPSHOTS_DIR)) {
      if (!name.endsWith('.jpg')) continue
      try { unlinkSync(join(SNAPSHOTS_DIR, name)); removeDetectionForFile(name); deleted++ } catch { skipped++ }
    }
  } catch {}
  res.json({ ok: true, deleted, skipped })
})

app.delete(/^\/api\/snapshots\/(.+)$/, (req, res) => {
  const filename = decodeURIComponent(req.params[0])
  if (!filename.endsWith('.jpg') || filename.includes('/') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' })
  }
  const file = join(SNAPSHOTS_DIR, filename)
  if (!existsSync(file)) return res.status(404).json({ error: 'Not found' })
  try {
    unlinkSync(file)
    removeDetectionForFile(filename)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Could not delete file' })
  }
})

// ─── Object detection (person/vehicle/etc, run on demand over existing
// recordings + snapshots) ─────────────────────────────────────────────────
//
// Deliberately NOT real-time: benchmarked at ~4.2s per frame on this machine
// (coco-ssd, lite_mobilenet_v2, pure-JS tfjs backend — same constraint as
// motion detection, no tfjs-node on Node 26, no GPU in Node). Running this
// per-frame during live motion detection would be far too slow and would
// stall everything else. Instead it's a manual batch job over already-
// captured footage, with everything else paused first to free up CPU.
//
// Confirmed via direct benchmark: feeding a smaller/cropped frame does NOT
// reduce inference time — coco-ssd internally resizes to its own fixed input
// size regardless of what you give it, so cropping only helps accuracy
// (less background noise), not speed. Not worth the extra complexity here.
const DETECTION_MIN_SCORE = 0.5        // discard low-confidence guesses
const DETECTION_FRAME_INTERVAL_SEC = 2.5 // how often to sample frames from a video

let cocoModel = null
async function getCocoModel() {
  if (!cocoModel) {
    console.log('  Object detection: loading model (first run, ~7-8s)…')
    cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' })
    console.log('  Object detection: model ready')
  }
  return cocoModel
}

function loadDetections() {
  if (!existsSync(DETECTIONS_FILE)) return {}
  try {
    return JSON.parse(readFileSync(DETECTIONS_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function saveDetections(detections) {
  writeFileSync(DETECTIONS_FILE, JSON.stringify(detections, null, 2))
}

// Deleting a recording/snapshot (manually, or via the storage retention
// sweep) used to leave its detections.json entry and any saved
// detection-frames/*.jpg files behind, pointing at a source that no longer
// exists — called from every recording/snapshot delete path so that never
// happens. A snapshot's own "frame" field points at itself (no separate
// frame file was ever saved for it — see detectInJpeg), so only unlink
// frame files that don't just equal the source name.
function removeDetectionForFile(name) {
  const detections = loadDetections()
  const entry = detections[name]
  if (!entry) return
  for (const c of entry.classes) {
    if (c.frame && c.frame !== name) {
      try { unlinkSync(join(DETECTION_FRAMES_DIR, c.frame)) } catch {}
    }
  }
  delete detections[name]
  saveDetections(detections)
}

// Decode a JPEG straight to an int32 RGB tensor — coco-ssd wants this shape
// (H, W, 3) with plain 0-255 pixel values. jpeg-js decodes to RGBA; drop the
// alpha channel (same decode approach as decodeGraySmall for motion
// detection, just keeping color instead of collapsing to gray).
function jpegBufferToTensor(buf) {
  const decoded = jpeg.decode(buf, { useTArray: true })
  const { width, height, data } = decoded
  const rgb = new Int32Array(width * height * 3)
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    rgb[j] = data[i]; rgb[j + 1] = data[i + 1]; rgb[j + 2] = data[i + 2]
  }
  return tf.tensor3d(rgb, [height, width, 3], 'int32')
}

async function detectInJpeg(model, buf) {
  const img = jpegBufferToTensor(buf)
  try {
    const preds = await model.detect(img)
    return preds
      .filter(p => p.score >= DETECTION_MIN_SCORE)
      .map(p => ({ class: p.class, score: Math.round(p.score * 100) / 100 }))
  } finally {
    img.dispose()
  }
}

// Sample frames out of a recording at a fixed interval and run detection on
// each, keeping the best (highest-score) hit per class across all sampled
// frames — a person only needs to be clearly visible in ONE sampled frame
// to count, they don't need to be in all of them. The winning frame for
// each class gets saved to DETECTION_FRAMES_DIR so the dashboard can show
// exactly what the model saw, instead of asking for trust on a bare label —
// requested after "no parece muy fino detectando" made clear that being
// able to eyeball the actual frame matters more than chasing model accuracy
// blind (a heavier base model was benchmarked and was both slower AND
// missed a detection the current one caught — see getCocoModel()).
async function detectInVideo(model, filePath, videoName) {
  const tmpDir = join(os.tmpdir(), `cctv-detect-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmpDir, { recursive: true })
  const pattern = join(tmpDir, 'f_%04d.jpg')
  try {
    await execAsync(
      `"${FFMPEG}" -loglevel quiet -i "${filePath}" -vf fps=1/${DETECTION_FRAME_INTERVAL_SEC} -q:v 5 "${pattern}"`,
      { timeout: 60000 }
    )
    const frames = readdirSync(tmpDir).filter(f => f.endsWith('.jpg')).sort()
    const best = new Map() // class -> { score, buf }
    for (const f of frames) {
      const buf = readFileSync(join(tmpDir, f))
      const preds = await detectInJpeg(model, buf)
      for (const p of preds) {
        if (!best.has(p.class) || best.get(p.class).score < p.score) best.set(p.class, { score: p.score, buf })
      }
    }
    const baseName = videoName.replace(/\.mp4$/, '')
    return [...best.entries()].map(([cls, { score, buf }]) => {
      const frameName = `${baseName}__${cls}.jpg`
      writeFileSync(join(DETECTION_FRAMES_DIR, frameName), buf)
      return { class: cls, score, frame: frameName }
    })
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
}

const detectionJob = { running: false, cancel: false, done: 0, total: 0, currentFile: null, startedAt: null }

async function runDetectionBatch() {
  if (detectionJob.running) return
  detectionJob.running = true
  detectionJob.cancel = false
  detectionJob.done = 0
  detectionJob.startedAt = new Date().toISOString()

  // Pause everything else so the batch gets the whole machine — this is a
  // background job, not real-time, so there's no reason to compete with the
  // live views for CPU. Motion detection restarts afterwards if it was on;
  // live-view streams don't need explicit restart, they come back on their
  // own the moment a tile is viewed again (getOrStartStream / idle-restart,
  // same mechanism used everywhere else in this file).
  const wasMotionActive = motionActive
  if (wasMotionActive) stopMotionDetection()
  for (const id of [...streams.keys()]) stopStream(id)

  try {
    const model = await getCocoModel()
    const detections = loadDetections()

    const recordingFiles = readdirSync(RECORDINGS_DIR).filter(f => f.endsWith('.mp4'))
    const snapshotFiles = readdirSync(SNAPSHOTS_DIR).filter(f => f.endsWith('.jpg'))
    // Only scan files not already analyzed — same "don't redo known work"
    // philosophy as the recordings duration cache. A "BORRAR RESULTADOS"
    // endpoint clears this if a full rescan is ever wanted.
    const todo = [
      ...recordingFiles.filter(f => !detections[f]).map(f => ({ name: f, kind: 'recording' })),
      ...snapshotFiles.filter(f => !detections[f]).map(f => ({ name: f, kind: 'snapshot' })),
    ]
    detectionJob.total = todo.length

    for (const item of todo) {
      if (detectionJob.cancel) break
      detectionJob.currentFile = item.name
      try {
        let classes
        if (item.kind === 'recording') {
          classes = await detectInVideo(model, join(RECORDINGS_DIR, item.name), item.name)
        } else {
          // The snapshot itself already IS the detection frame — no separate
          // frame file to save, just point `frame` at the snapshot directly.
          const preds = await detectInJpeg(model, readFileSync(join(SNAPSHOTS_DIR, item.name)))
          classes = preds.map(p => ({ ...p, frame: item.name }))
        }
        detections[item.name] = { kind: item.kind, classes, scannedAt: new Date().toISOString() }
      } catch (e) {
        console.error(`  Object detection failed for ${item.name}:`, e.message)
        detections[item.name] = { kind: item.kind, classes: [], scannedAt: new Date().toISOString(), error: true }
      }
      saveDetections(detections) // incremental — a cancelled/crashed run doesn't lose completed work
      detectionJob.done++
    }
  } finally {
    detectionJob.running = false
    detectionJob.currentFile = null
    if (wasMotionActive) startMotionDetection()
  }
}

app.post('/api/detect/run', (_req, res) => {
  if (detectionJob.running) return res.status(409).json({ error: 'Ya hay un análisis en curso' })
  runDetectionBatch() // fire-and-forget — client polls /api/detect/status
  res.json({ ok: true })
})

app.post('/api/detect/stop', (_req, res) => {
  detectionJob.cancel = true
  res.json({ ok: true })
})

app.get('/api/detect/status', (_req, res) => {
  const { running, done, total, currentFile, startedAt } = detectionJob
  res.json({ running, done, total, currentFile, startedAt })
})

app.get('/api/detect/results', (_req, res) => {
  const detections = loadDetections()
  const results = Object.entries(detections).map(([name, d]) => ({ name, ...d }))
  results.sort((a, b) => (b.scannedAt || '').localeCompare(a.scannedAt || ''))
  res.json(results)
})

app.delete('/api/detect/results', (_req, res) => {
  saveDetections({})
  try { rmSync(DETECTION_FRAMES_DIR, { recursive: true, force: true }) } catch {}
  mkdirSync(DETECTION_FRAMES_DIR, { recursive: true })
  res.json({ ok: true })
})

// Serve the still frame that produced a detection — for recordings this is
// a sampled frame saved by detectInVideo(); for snapshots the "frame" field
// just points at the snapshot itself, served from SNAPSHOTS_DIR instead.
app.get('/detection-frames/:file', (req, res) => {
  const inFrames = join(DETECTION_FRAMES_DIR, req.params.file)
  const inSnapshots = join(SNAPSHOTS_DIR, req.params.file)
  const file = existsSync(inFrames) ? inFrames : inSnapshots
  if (!existsSync(file)) return res.status(404).send('Not found')
  res.sendFile(file)
})

// ─── Alerts (real, generated by motion detection) ───────────────────────────────

app.get('/api/alerts', (_req, res) => {
  res.json(loadAlerts())
})

app.delete('/api/alerts', (_req, res) => {
  writeFileSync(ALERTS_FILE, JSON.stringify([], null, 2))
  res.json({ ok: true })
})

// ─── Motion detection ────────────────────────────────────────────────────────────

app.get('/api/motion/status', (_req, res) => {
  res.json({ active: motionActive, cameras: Object.fromEntries(motionState) })
})

app.post('/api/motion/start', (_req, res) => {
  startMotionDetection()
  res.json({ ok: true, active: motionActive })
})

app.post('/api/motion/stop', (_req, res) => {
  stopMotionDetection()
  res.json({ ok: true, active: motionActive })
})

// ─── Camera discovery ──────────────────────────────────────────────────────────

const RTSP_PATHS = {
  zosi:      ['/video1', '/video2', '/h264/ch1/main/av_stream', '/ch01/0'],
  hikvision: ['/Streaming/Channels/101', '/Streaming/Channels/1', '/h264/ch1/main/av_stream'],
  dahua:     ['/cam/realmonitor?channel=1&subtype=0', '/cam/realmonitor?channel=1&subtype=1'],
  reolink:   ['/h264Preview_01_main', '/h265Preview_01_main', '/h264Preview_01_sub'],
  generic:   ['/video1', '/1', '/stream1', '/live/ch0', '/ch01.264', '/onvif/media', '/videoMain'],
}

const CREDENTIALS = ['admin:admin', 'admin:', 'admin:12345', 'admin:123456', 'root:']

// TCP probe — basic port reachability
function tcpProbe(ip, port, timeout = 900) {
  return new Promise(resolve => {
    const sock = new net.Socket()
    sock.setTimeout(timeout)
    sock.connect(port, ip, () => { sock.destroy(); resolve(true) })
    sock.on('error', () => resolve(false))
    sock.on('timeout', () => { sock.destroy(); resolve(false) })
  })
}

// RTSP probe — sends OPTIONS and classifies the response:
//   'rtsp'     → server replied with RTSP/1.0 (confirmed camera, may be 401)
//   'possible' → TCP accepted but no recognisable RTSP reply (keep, run ffmpeg)
//   'reject'   → connection refused or pure HTTP reply (not a camera)
function rtspOptionsProbe(ip, port, timeout = 2500) {
  return new Promise(resolve => {
    const sock = new net.Socket()
    sock.setTimeout(timeout)
    let banner = ''
    sock.connect(port, ip, () => {
      sock.write(`OPTIONS rtsp://${ip}:${port}/ RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: SentinelOps\r\n\r\n`)
    })
    sock.on('data', chunk => {
      banner += chunk.toString()
      if (banner.length > 128) sock.destroy()
    })
    sock.on('close', () => {
      if (banner.startsWith('RTSP/')) return resolve('rtsp')
      // Reject plain HTTP servers (web routers, NAS dashboards, etc.)
      if (banner.startsWith('HTTP/')) return resolve('reject')
      // Unknown but accepted the connection — worth trying with ffmpeg
      resolve(banner.length > 0 ? 'possible' : 'reject')
    })
    sock.on('error', () => resolve('reject'))
    sock.on('timeout', () => { sock.destroy(); resolve('reject') })
  })
}

// HTTP banner — only called after RTSP is confirmed, for vendor fingerprinting
function httpBanner(ip, port = 80, timeout = 1500) {
  return new Promise(resolve => {
    const sock = new net.Socket()
    sock.setTimeout(timeout)
    let data = ''
    sock.connect(port, ip, () => {
      sock.write(`GET / HTTP/1.0\r\nHost: ${ip}\r\n\r\n`)
    })
    sock.on('data', d => { data += d.toString(); if (data.length > 1500) sock.destroy() })
    sock.on('close', () => resolve(data))
    sock.on('error', () => resolve(''))
    sock.on('timeout', () => { sock.destroy(); resolve(data) })
  })
}

function detectVendor(openPorts, banner) {
  const b = banner.toLowerCase()
  if (b.includes('hikvision') || b.includes('dvr html')) return 'hikvision'
  if (b.includes('dahua') || openPorts.includes(37777)) return 'dahua'
  if (b.includes('reolink')) return 'reolink'
  if (openPorts.includes(23)) return 'zosi'
  return 'generic'
}

// ffmpeg stream test — confirms actual video data flows (used as final verification)
function testRtsp(url) {
  return new Promise(resolve => {
    const proc = spawn(FFMPEG, [
      // 'info' (not 'error'): the "Stream ... Video:" banner we grep for
      // below is only emitted at info level — at 'error' it never prints,
      // which silently made every verification fail even for a working feed.
      '-loglevel', 'info',
      '-rtsp_transport', 'tcp',
      '-i', url,
      '-frames:v', '1',
      '-f', 'null', '/dev/null',
    ])
    let ok = false
    proc.on('error', () => resolve(false))
    proc.stderr.on('data', d => {
      if (d.toString().includes('Video:')) ok = true
    })
    const timer = setTimeout(() => { proc.kill('SIGKILL'); resolve(ok) }, 6000)
    proc.on('close', () => { clearTimeout(timer); resolve(ok) })
  })
}

// Detect which /24 subnets the machine has active interfaces on.
// Uses Node's built-in os.networkInterfaces() — no shelling out, works
// identically on macOS, Linux and Windows.
function getActiveSubnets() {
  const found = new Set()
  for (const ifaceList of Object.values(os.networkInterfaces())) {
    for (const iface of ifaceList ?? []) {
      if (iface.family !== 'IPv4' || iface.internal) continue
      found.add(iface.address.split('.').slice(0, 3).join('.'))
    }
  }
  return found.size ? [...found] : ['192.168.50', '192.168.1']
}

// ping's timeout flag differs by OS: BSD/macOS take milliseconds, Linux
// (iputils) takes whole seconds, Windows uses different flags entirely.
function pingArgs(ip) {
  if (process.platform === 'win32') return ['-n', '1', '-w', '500', ip]
  if (process.platform === 'darwin') return ['-c', '1', '-W', '500', ip]
  return ['-c', '1', '-W', '1', ip] // Linux: minimum whole-second timeout
}

// Read the OS ARP/neighbor table → Map<ip, mac>. `arp -an` works on both
// macOS and Linux (net-tools); minimal Linux installs without net-tools
// fall back to `ip neigh` (iproute2).
function readArpTable() {
  const table = new Map()
  let arpOut = ''
  try {
    arpOut = execSync('arp -an 2>/dev/null').toString()
  } catch {}
  for (const m of arpOut.matchAll(/\((\d+\.\d+\.\d+\.\d+)\) at (?!incomplete)([0-9a-f:]+)/gi)) {
    table.set(m[1], m[2].toLowerCase())
  }
  if (table.size === 0) {
    try {
      const neighOut = execSync('ip neigh show 2>/dev/null').toString()
      for (const m of neighOut.matchAll(/^(\d+\.\d+\.\d+\.\d+)\s+.*lladdr\s+([0-9a-f:]+)/gim)) {
        table.set(m[1], m[2].toLowerCase())
      }
    } catch {}
  }
  return table
}

// Look up the current MAC address for a single IP (used when adding a
// camera, so we can record a MAC baseline for future conflict detection).
function getMac(ip) {
  return readArpTable().get(ip) ?? null
}

// Ping sweep → ARP read: returns {ip, mac} for live hosts on the given subnets
// Much faster than blind TCP scan — only probes hosts that actually exist
async function discoverLiveHosts(subnets) {
  // 1. Parallel ping sweep to populate the ARP table
  const pings = subnets.flatMap(sub =>
    Array.from({ length: 254 }, (_, i) => {
      const ip = `${sub}.${i + 1}`
      return new Promise(resolve => {
        const p = spawn('ping', pingArgs(ip))
        p.on('error', () => resolve(1))
        p.on('close', resolve)
      })
    })
  )
  await Promise.all(pings)

  // 2. Read ARP table — only entries with a resolved MAC (incomplete = dead host)
  const table = readArpTable()
  return [...table.entries()].map(([ip, mac]) => ({ ip, mac }))
}

// Discovery:
//  Phase 1 — Ping sweep + ARP to find live hosts (fast, no blind scanning)
//  Phase 2 — TCP probe RTSP ports on live hosts only
//  Phase 3 — RTSP OPTIONS handshake (drops non-camera devices)
//  Phase 4 — Fingerprint vendor
//  Phase 5 — ffmpeg verify to find the working stream URL
app.get('/api/discover', async (_req, res) => {
  const RTSP_PORTS = [554, 8554]
  const SECONDARY_PORTS = [23, 80, 8080, 37777, 34567, 8000]
  const TCP_TIMEOUT = 1500

  const subnets = getActiveSubnets()
  console.log('  Discover: live-host sweep on', subnets.join(', '))

  const cameras = loadConfig()
  // Map configured camera IP → camera object (to compare against live MACs)
  const existingByIp = new Map(
    cameras
      .map(c => { const m = c.rtsp.match(/\b(\d+\.\d+\.\d+\.\d+)\b/); return m ? [m[1], c] : null })
      .filter(Boolean)
  )

  // Phase 1: ping sweep → ARP → list of live {ip, mac}
  const allLive = await discoverLiveHosts(subnets)

  // Cameras already configured, seen with the SAME mac we recorded when they
  // were added → same physical device, nothing new to report. Cameras whose
  // IP is reused by a DIFFERENT mac are a real conflict (e.g. two Zosi units
  // sharing the same factory-default IP) and are kept as candidates, flagged.
  // Cameras with no stored mac yet (added before this existed) get a
  // one-time baseline backfill instead of being flagged as a conflict.
  let configDirty = false
  const liveHosts = []
  for (const { ip, mac } of allLive) {
    const cam = existingByIp.get(ip)
    if (!cam) { liveHosts.push({ ip, mac, conflictsWith: null }); continue }
    if (!cam.mac) { cam.mac = mac; configDirty = true; continue }
    if (cam.mac === mac) continue // confirmed same device — nothing to surface
    liveHosts.push({ ip, mac, conflictsWith: { id: cam.id, label: cam.label } })
  }
  if (configDirty) saveConfig(cameras)

  console.log(`  Discover: ${liveHosts.length} live hosts found (excluding already-confirmed cameras)`)

  // Phase 2: probe RTSP ports only on live hosts (small set, no batching needed)
  const rtspHosts = []
  await Promise.all(
    liveHosts.flatMap(({ ip, mac, conflictsWith }) =>
      RTSP_PORTS.map(port =>
        tcpProbe(ip, port, TCP_TIMEOUT).then(open => {
          if (open) rtspHosts.push({ ip, mac, conflictsWith, port })
        })
      )
    )
  )
  console.log(`  Discover: ${rtspHosts.length} hosts with RTSP port open`)

  if (rtspHosts.length === 0) return res.json([])

  // Phase 2: RTSP OPTIONS — filter by protocol response
  //   'rtsp'     → keep (confirmed RTSP server, may need auth)
  //   'possible' → keep (accepted TCP, no clear reply — worth trying with ffmpeg)
  //   'reject'   → drop (HTTP server, or no response at all)
  const confirmed = (
    await Promise.all(
      rtspHosts.map(async ({ ip, mac, conflictsWith, port }) => {
        const verdict = await rtspOptionsProbe(ip, port)
        return verdict !== 'reject'
          ? { ip, mac, conflictsWith, rtspPort: port, rtspConfirmed: verdict === 'rtsp' }
          : null
      })
    )
  ).filter(Boolean)

  if (confirmed.length === 0) return res.json([])

  // Phase 3: fingerprint (secondary ports + HTTP) — only for confirmed cameras
  const results = await Promise.all(confirmed.map(async ({ ip, mac, conflictsWith, rtspPort, rtspConfirmed }) => {
    const secProbes = await Promise.all(
      SECONDARY_PORTS.map(p => tcpProbe(ip, p, TCP_TIMEOUT).then(open => open ? p : null))
    )
    const openPorts = [rtspPort, ...secProbes.filter(Boolean)]
    const httpPort = openPorts.find(p => p === 80 || p === 8080)
    const banner = httpPort ? await httpBanner(ip, httpPort) : ''
    const vendor = detectVendor(openPorts, banner)
    const paths = RTSP_PATHS[vendor] ?? RTSP_PATHS.generic
    const candidates = CREDENTIALS.flatMap(cred =>
      paths.map(path => `rtsp://${cred}@${ip}:${rtspPort}${path}`)
    )
    return { ip, mac, conflictsWith, rtspPort, openPorts, vendor, candidates, verified: null, rtspConfirmed }
  }))

  // Phase 4: ffmpeg verify to find the working URL per camera
  await Promise.all(results.map(async r => {
    for (const url of r.candidates) {
      if (await testRtsp(url)) { r.verified = url; break }
    }
  }))

  // Only return devices where either RTSP OPTIONS confirmed the server,
  // or ffmpeg actually streamed — drops 'possible' devices with no real stream
  res.json(results.filter(r => r.rtspConfirmed || r.verified))
})

// Quick RTSP test endpoint (used by the frontend "Probar" button)
app.post('/api/test-rtsp', express.json(), async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ ok: false, error: 'url required' })
  const ok = await testRtsp(url)
  res.json({ ok })
})

// Serve built React app (production mode)
const DIST = join(__dirname, 'dist')
if (existsSync(DIST)) {
  app.use(express.static(DIST))
  // SPA fallback — Express 5 compatible wildcard
  app.use((_req, res) => res.sendFile(join(DIST, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`\n  CCTV Proxy  →  http://localhost:${PORT}`)
  console.log(`  Stream      →  http://localhost:${PORT}/stream/<id>`)
  console.log(`  API         →  http://localhost:${PORT}/api/cameras\n`)
})
