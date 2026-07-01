import express from 'express'
import cors from 'cors'
import { spawn, execSync, exec } from 'child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, unlinkSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'
import net from 'net'
import os from 'os'
import ffmpegStatic from 'ffmpeg-static'

const execAsync = promisify(exec)

const __dirname = dirname(fileURLToPath(import.meta.url))

const PORT = process.env.PORT || 3001
const RECORDINGS_DIR = join(__dirname, 'recordings')
const CONFIG_FILE = join(__dirname, 'cameras.json')

mkdirSync(RECORDINGS_DIR, { recursive: true })

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

// --- Auto network alias setup (macOS only) ---
// The camera lives on an isolated subnet reachable only via a specific
// network interface that needs an IP alias on it (see README). This is a
// macOS-specific ifconfig/osascript trick; on Linux configure the
// equivalent with `ip addr add`, or set CCTV_SKIP_NET_SETUP=1 and do it
// yourself (systemd unit, netplan, etc).
const NET_IFACE = process.env.CCTV_NET_IFACE || 'en0'
const NET_ALIASES = (process.env.CCTV_NET_ALIASES || '192.168.138.100,192.168.138.1').split(',')

function setupNetworkAliases() {
  if (process.env.CCTV_SKIP_NET_SETUP === '1') {
    console.log('  Network alias setup skipped (CCTV_SKIP_NET_SETUP=1)')
    return
  }
  if (process.platform !== 'darwin') {
    console.log(`  Network alias setup skipped (only implemented for macOS). If the camera is on an isolated subnet, configure it manually, e.g.: sudo ip addr add ${NET_ALIASES[0]}/24 dev <iface>`)
    return
  }
  try {
    const ifaces = execSync(`ifconfig ${NET_IFACE} 2>/dev/null`).toString()
    if (ifaces.includes(NET_ALIASES[0])) {
      console.log('  ✓ Network aliases already active')
      return
    }
    const ALIAS_CMD = NET_ALIASES.map(ip => `ifconfig ${NET_IFACE} alias ${ip} netmask 255.255.255.0`).join(' && ')
    try {
      execSync(`sudo -n sh -c '${ALIAS_CMD}'`, { timeout: 5000, stdio: 'pipe' })
      console.log('  ✓ Network aliases set (sudo)')
    } catch {
      console.log('  Setting up camera subnet aliases (one-time admin prompt)…')
      execSync(
        `osascript -e 'do shell script "${ALIAS_CMD}" with administrator privileges'`,
        { timeout: 30000 }
      )
      console.log('  ✓ Network aliases set')
    }
  } catch (e) {
    console.log('  ✗ Network alias setup skipped (camera may be unreachable)')
  }
}

setupNetworkAliases()

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

// --- Active stream processes ---
// entry: { proc, clients, latestFrame, lastFrameTime }
const streams = new Map()
const recordings = new Map()

const STALE_FRAME_MS = 3000  // serve 503 if last frame is older than this

function getOrStartStream(camera) {
  if (streams.has(camera.id)) return streams.get(camera.id)

  const entry = { proc: null, clients: new Set(), latestFrame: null, lastFrameTime: 0 }

  const args = [
    '-loglevel', 'quiet',
    '-rtsp_transport', 'tcp',
    '-i', camera.rtsp,
    '-vf', 'scale=1280:720',
    '-q:v', '5',
    '-r', '12',
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

// --- App ---
const app = express()
app.use(cors())
app.use(express.json())

// List cameras
app.get('/api/cameras', (_req, res) => {
  const cameras = loadConfig()
  const withStatus = cameras.map(c => ({
    ...c,
    streaming: streams.has(c.id),
    recording: recordings.has(c.id),
  }))
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
  cameras.push(camera)
  saveConfig(cameras)
  res.status(201).json(camera)
})

// Rename / update camera label & zone
app.patch('/api/cameras/:id', (req, res) => {
  const { label, zone } = req.body
  const cameras = loadConfig()
  const cam = cameras.find(c => c.id === req.params.id)
  if (!cam) return res.status(404).json({ error: 'Not found' })
  if (label) cam.label = label.trim()
  if (zone !== undefined) cam.zone = zone.trim()
  saveConfig(cameras)
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

  // Wait up to 4s for the first frame
  const deadline = setTimeout(() => {
    if (!res.headersSent) res.status(503).send('No frame yet')
  }, 4000)

  const check = setInterval(() => {
    if (entry.latestFrame) {
      clearInterval(check)
      clearTimeout(deadline)
      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.send(entry.latestFrame)
    }
  }, 50)
})

// Start recording
app.post('/api/cameras/:id/record/start', (req, res) => {
  const cameras = loadConfig()
  const camera = cameras.find(c => c.id === req.params.id)
  if (!camera) return res.status(404).json({ error: 'Camera not found' })
  if (recordings.has(camera.id)) return res.json({ ok: true, file: recordings.get(camera.id).file })

  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  const ts = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  const file = join(RECORDINGS_DIR, `${camera.id}_${ts}.mp4`)

  const args = [
    '-loglevel', 'quiet',
    '-rtsp_transport', 'tcp',
    '-i', camera.rtsp,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    file,
  ]

  const proc = spawn(FFMPEG, args)
  recordings.set(camera.id, { proc, file })

  proc.on('error', (err) => {
    console.error(`  ✗ ffmpeg recording failed to start for ${camera.id}:`, err.message)
    recordings.delete(camera.id)
  })
  proc.on('close', () => recordings.delete(camera.id))

  res.json({ ok: true, file })
})

// Stop recording
app.post('/api/cameras/:id/record/stop', (req, res) => {
  const rec = recordings.get(req.params.id)
  if (!rec) return res.json({ ok: true })
  try { rec.proc.kill('SIGINT') } catch (_) {} // SIGINT triggers clean finalization
  setTimeout(() => recordings.delete(req.params.id), 2000)
  res.json({ ok: true, file: rec.file })
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
app.get('/api/recordings/meta', async (_req, res) => {
  const files = readdirSync(RECORDINGS_DIR).filter(f => f.endsWith('.mp4')).sort()
  const meta = await Promise.all(files.map(async name => {
    const file = join(RECORDINGS_DIR, name)
    const { size } = statSync(file)
    try {
      // ffmpeg -i exits non-zero but writes file info to stderr
      await execAsync(`"${FFMPEG}" -i "${file}"`, { timeout: 5000 })
      return { name, duration: 0, size }
    } catch (e) {
      const stderr = (e && typeof e === 'object' && 'stderr' in e) ? String(e.stderr) : ''
      const m = stderr.match(/Duration: (\d+):(\d+):(\d+)/)
      const duration = m ? parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) : 0
      return { name, duration, size }
    }
  }))
  res.json(meta)
})

// Disk usage stats for the recordings partition
app.get('/api/stats', (_req, res) => {
  let diskPercent = 0
  let recordingsTotalBytes = 0
  try {
    const out = execSync(`df -k "${RECORDINGS_DIR}" 2>/dev/null`).toString()
    const lines = out.trim().split('\n')
    const parts = lines[lines.length - 1].trim().split(/\s+/)
    // macOS df -k: Filesystem 1024-blocks Used Available Capacity ...
    diskPercent = parseInt(parts[4]?.replace('%', '') ?? '0') || 0
  } catch {}
  try {
    const files = readdirSync(RECORDINGS_DIR).filter(f => f.endsWith('.mp4'))
    for (const f of files) recordingsTotalBytes += statSync(join(RECORDINGS_DIR, f)).size
  } catch {}
  res.json({ diskPercent, recordingsTotalBytes })
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
      '-loglevel', 'error',
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

// Ping sweep → ARP read: returns IPs of live hosts on the given subnet
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
  // `arp -an` works on both macOS and Linux (net-tools); minimal Linux
  // installs without net-tools fall back to `ip neigh` (iproute2).
  const live = new Set()
  let arpOut = ''
  try {
    arpOut = execSync('arp -an 2>/dev/null').toString()
  } catch {}
  for (const m of arpOut.matchAll(/\((\d+\.\d+\.\d+\.\d+)\) at (?!incomplete)([0-9a-f:]+)/gi)) {
    live.add(m[1])
  }
  if (live.size === 0) {
    try {
      const neighOut = execSync('ip neigh show 2>/dev/null').toString()
      for (const m of neighOut.matchAll(/^(\d+\.\d+\.\d+\.\d+)\s+.*lladdr\s+[0-9a-f:]+/gim)) {
        live.add(m[1])
      }
    } catch {}
  }
  return [...live]
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

  const existing = new Set(
    loadConfig()
      .map(c => { const m = c.rtsp.match(/\b(\d+\.\d+\.\d+\.\d+)\b/); return m?.[1] ?? null })
      .filter(Boolean)
  )

  // Phase 1: ping sweep → ARP → list of live IPs
  const liveHosts = (await discoverLiveHosts(subnets))
    .filter(ip => !existing.has(ip))

  console.log(`  Discover: ${liveHosts.length} live hosts found (excluding already configured)`)

  // Phase 2: probe RTSP ports only on live hosts (small set, no batching needed)
  const rtspHosts = []
  await Promise.all(
    liveHosts.flatMap(ip =>
      RTSP_PORTS.map(port =>
        tcpProbe(ip, port, TCP_TIMEOUT).then(open => {
          if (open) rtspHosts.push({ ip, port })
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
      rtspHosts.map(async ({ ip, port }) => {
        const verdict = await rtspOptionsProbe(ip, port)
        return verdict !== 'reject' ? { ip, rtspPort: port, rtspConfirmed: verdict === 'rtsp' } : null
      })
    )
  ).filter(Boolean)

  if (confirmed.length === 0) return res.json([])

  // Phase 3: fingerprint (secondary ports + HTTP) — only for confirmed cameras
  const results = await Promise.all(confirmed.map(async ({ ip, rtspPort, rtspConfirmed }) => {
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
    return { ip, rtspPort, openPorts, vendor, candidates, verified: null, rtspConfirmed }
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
