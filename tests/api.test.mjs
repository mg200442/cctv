// Integration tests against the real server.js, spawned as a child process
// per suite with an isolated CCTV_DATA_DIR (see DATA_DIR in server.js) so
// nothing here ever touches this project's real cameras.json/recordings/
// alerts/etc. Run with: npm test (node --test tests/).
//
// Why this shape instead of unit-testing individual functions: server.js is
// a single-file Express app with a lot of module-level side effects
// (ffmpeg resolution, network alias setup, mkdirSync calls) that make it
// impractical to import piecemeal — spawning the real process and hitting
// it over HTTP is what every manual verification this project has ever had
// already does (see CLAUDE.md's various "verified with curl" notes), so
// these tests just automate that same approach instead of re-architecting
// the server to be importable.
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

async function waitForServer(baseUrl, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/cameras`)
      if (res.status === 200 || res.status === 401) return // 401 = auth suite, server IS up
    } catch {}
    await new Promise(r => setTimeout(r, 300))
  }
  throw new Error(`Server at ${baseUrl} didn't come up within ${timeoutMs}ms`)
}

// Starts a real server.js child process against a fresh temp DATA_DIR.
// Returns { baseUrl, dataDir, stop() }.
function startServer(port, extraEnv = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), 'cctv-test-'))
  const proc = spawn('node', ['server.js'], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      CCTV_DATA_DIR: dataDir,
      CCTV_SKIP_NET_SETUP: '1', // no macOS network alias / admin prompt during tests
      ...extraEnv,
    },
    stdio: 'pipe',
  })
  // Surface unexpected crashes instead of failing tests with a bare timeout.
  let stderr = ''
  proc.stderr.on('data', d => { stderr += d.toString() })
  return {
    baseUrl: `http://localhost:${port}`,
    dataDir,
    getStderr: () => stderr,
    async stop() {
      proc.kill('SIGTERM')
      await new Promise(r => proc.on('exit', r))
      rmSync(dataDir, { recursive: true, force: true })
    },
  }
}

describe('cameras + alerts + settings', () => {
  let server
  before(async () => {
    server = startServer(3099)
    await waitForServer(server.baseUrl)
  })
  after(() => server.stop())

  test('GET /api/cameras returns the default camera seeded on first run', async () => {
    const res = await fetch(`${server.baseUrl}/api/cameras`)
    assert.equal(res.status, 200)
    const cameras = await res.json()
    assert.ok(Array.isArray(cameras))
    assert.equal(cameras.length, 1)
    assert.equal(cameras[0].id, 'cam-01')
    assert.equal(cameras[0].enabled, true)
  })

  test('PATCH /api/cameras/:id toggles enabled and it persists on next GET', async () => {
    let res = await fetch(`${server.baseUrl}/api/cameras/cam-01`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    })
    assert.equal(res.status, 200)
    res = await fetch(`${server.baseUrl}/api/cameras`)
    const cameras = await res.json()
    assert.equal(cameras[0].enabled, false)
  })

  test('PATCH /api/cameras/:id on an unknown id returns 404', async () => {
    const res = await fetch(`${server.baseUrl}/api/cameras/does-not-exist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    })
    assert.equal(res.status, 404)
  })

  test('DELETE /api/alerts clears alerts', async () => {
    let res = await fetch(`${server.baseUrl}/api/alerts`)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), [])

    res = await fetch(`${server.baseUrl}/api/alerts`, { method: 'DELETE' })
    assert.equal(res.status, 200)

    res = await fetch(`${server.baseUrl}/api/alerts`)
    assert.deepEqual(await res.json(), [])
  })

  test('GET/PUT /api/settings roundtrip, with a sane default', async () => {
    let res = await fetch(`${server.baseUrl}/api/settings`)
    assert.equal((await res.json()).maxStorageGB, 10)

    res = await fetch(`${server.baseUrl}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxStorageGB: 42 }),
    })
    assert.equal(res.status, 200)

    res = await fetch(`${server.baseUrl}/api/settings`)
    assert.equal((await res.json()).maxStorageGB, 42)
  })

  test('PUT /api/settings rejects a non-positive value', async () => {
    const res = await fetch(`${server.baseUrl}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxStorageGB: -5 }),
    })
    assert.equal(res.status, 400)
  })

  test('PUT /api/settings streamPreset roundtrips independently of maxStorageGB', async () => {
    let res = await fetch(`${server.baseUrl}/api/settings`)
    assert.equal((await res.json()).streamPreset, 'equilibrado')

    res = await fetch(`${server.baseUrl}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamPreset: 'ahorro' }),
    })
    assert.equal(res.status, 200)

    res = await fetch(`${server.baseUrl}/api/settings`)
    const settings = await res.json()
    assert.equal(settings.streamPreset, 'ahorro')
    assert.equal(settings.maxStorageGB, 42) // untouched by the streamPreset-only PUT above
  })

  test('PUT /api/settings rejects an invalid streamPreset', async () => {
    const res = await fetch(`${server.baseUrl}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamPreset: 'bogus' }),
    })
    assert.equal(res.status, 400)
  })

  test('PATCH /api/cameras/:id streamPreset roundtrips and null clears it back to inherit', async () => {
    let res = await fetch(`${server.baseUrl}/api/cameras/cam-01`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamPreset: 'calidad-max' }),
    })
    assert.equal(res.status, 200)

    res = await fetch(`${server.baseUrl}/api/cameras`)
    assert.equal((await res.json())[0].streamPreset, 'calidad-max')

    res = await fetch(`${server.baseUrl}/api/cameras/cam-01`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamPreset: null }),
    })
    assert.equal(res.status, 200)

    res = await fetch(`${server.baseUrl}/api/cameras`)
    assert.equal((await res.json())[0].streamPreset, undefined)
  })

  test('PATCH /api/cameras/:id rejects an invalid streamPreset', async () => {
    const res = await fetch(`${server.baseUrl}/api/cameras/cam-01`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamPreset: 'bogus' }),
    })
    assert.equal(res.status, 400)
  })

  test('PATCH /api/cameras/:id streamPreset "custom" roundtrips customStream and clears on USAR GLOBAL', async () => {
    let res = await fetch(`${server.baseUrl}/api/cameras/cam-01`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamPreset: 'custom', customStream: { width: 800, height: 450, q: 6, fps: 10 } }),
    })
    assert.equal(res.status, 200)

    res = await fetch(`${server.baseUrl}/api/cameras`)
    const cam = (await res.json())[0]
    assert.equal(cam.streamPreset, 'custom')
    assert.deepEqual(cam.customStream, { width: 800, height: 450, q: 6, fps: 10 })

    // Clearing back to global (null) also drops the now-stale customStream,
    // so it doesn't linger and reappear if 'custom' gets picked again later.
    res = await fetch(`${server.baseUrl}/api/cameras/cam-01`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamPreset: null }),
    })
    assert.equal(res.status, 200)

    res = await fetch(`${server.baseUrl}/api/cameras`)
    const cleared = (await res.json())[0]
    assert.equal(cleared.streamPreset, undefined)
    assert.equal(cleared.customStream, undefined)
  })

  test('PATCH /api/cameras/:id rejects streamPreset "custom" with an out-of-range or missing customStream', async () => {
    let res = await fetch(`${server.baseUrl}/api/cameras/cam-01`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamPreset: 'custom' }), // no customStream at all
    })
    assert.equal(res.status, 400)

    res = await fetch(`${server.baseUrl}/api/cameras/cam-01`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamPreset: 'custom', customStream: { width: 99999, height: 450, q: 6, fps: 10 } }),
    })
    assert.equal(res.status, 400)
  })
})

describe('deleting a recording cleans up its detection data (no orphans)', () => {
  let server
  before(async () => {
    server = startServer(3097)
    await waitForServer(server.baseUrl)
  })
  after(() => server.stop())

  test('DELETE /api/recordings/:file removes the matching detections.json entry and frame files', async () => {
    const name = 'cam-01_2026-01-01T00-00-00.mp4'
    const recDir = join(server.dataDir, 'recordings')
    const framesDir = join(server.dataDir, 'detection-frames')
    mkdirSync(recDir, { recursive: true })
    mkdirSync(framesDir, { recursive: true })

    // Seed a fake recording + a detections.json entry + frame files exactly
    // like a real analysis run would produce (see detectInVideo in server.js).
    writeFileSync(join(recDir, name), Buffer.from([0xff, 0xd8, 0xff, 0xd9]))
    const personFrame = 'cam-01_2026-01-01T00-00-00__person.jpg'
    const dogFrame = 'cam-01_2026-01-01T00-00-00__dog.jpg'
    writeFileSync(join(framesDir, personFrame), Buffer.from([0xff, 0xd8, 0xff, 0xd9]))
    writeFileSync(join(framesDir, dogFrame), Buffer.from([0xff, 0xd8, 0xff, 0xd9]))
    writeFileSync(join(server.dataDir, 'detections.json'), JSON.stringify({
      [name]: {
        kind: 'recording',
        classes: [
          { class: 'person', score: 0.8, frame: personFrame },
          { class: 'dog', score: 0.6, frame: dogFrame },
        ],
        scannedAt: new Date().toISOString(),
      },
    }))

    let res = await fetch(`${server.baseUrl}/api/detect/results`)
    let results = await res.json()
    assert.equal(results.length, 1, 'seeded detection should be visible before delete')

    res = await fetch(`${server.baseUrl}/api/recordings/${encodeURIComponent(name)}`, { method: 'DELETE' })
    assert.equal(res.status, 200)

    res = await fetch(`${server.baseUrl}/api/detect/results`)
    results = await res.json()
    assert.equal(results.length, 0, 'detections.json entry should be gone after deleting its source recording')
    assert.ok(!existsSync(join(framesDir, personFrame)), 'orphaned person frame should be deleted')
    assert.ok(!existsSync(join(framesDir, dogFrame)), 'orphaned dog frame should be deleted')
  })
})

describe('storage retention', () => {
  let server
  before(async () => {
    server = startServer(3096)
    await waitForServer(server.baseUrl)
  })
  after(() => server.stop())

  test('POST /api/storage/enforce deletes the oldest files first until under ~90% of the cap', async () => {
    const recDir = join(server.dataDir, 'recordings')
    mkdirSync(recDir, { recursive: true })
    // Three ~1MB files, oldest (by the timestamp encoded in the filename,
    // per fileCaptureTime in server.js) should go first.
    const oneMB = Buffer.alloc(1024 * 1024, 1)
    writeFileSync(join(recDir, 'cam-01_2026-01-01T00-00-00.mp4'), oneMB)
    writeFileSync(join(recDir, 'cam-01_2026-01-02T00-00-00.mp4'), oneMB)
    writeFileSync(join(recDir, 'cam-01_2026-01-03T00-00-00.mp4'), oneMB)

    // Cap chosen so exactly one deletion is needed: 3MB total, 2.5MB cap
    // (target 90% = 2.25MB) — removing the oldest 1MB file brings it to
    // 2MB, which clears the target; removing a second isn't required.
    let res = await fetch(`${server.baseUrl}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxStorageGB: 2.5 / 1024 }),
    })
    assert.equal(res.status, 200)

    res = await fetch(`${server.baseUrl}/api/storage/enforce`, { method: 'POST' })
    const result = await res.json()
    assert.equal(result.deleted, 1, 'should delete exactly the one oldest file to get under the target')
    assert.ok(!existsSync(join(recDir, 'cam-01_2026-01-01T00-00-00.mp4')), 'oldest file should be gone')
    assert.ok(existsSync(join(recDir, 'cam-01_2026-01-02T00-00-00.mp4')), 'newer files should survive')
    assert.ok(existsSync(join(recDir, 'cam-01_2026-01-03T00-00-00.mp4')), 'newer files should survive')
  })

  test('POST /api/storage/enforce is a no-op when already under the cap', async () => {
    await fetch(`${server.baseUrl}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxStorageGB: 10 }),
    })
    const res = await fetch(`${server.baseUrl}/api/storage/enforce`, { method: 'POST' })
    const result = await res.json()
    assert.equal(result.deleted, 0)
  })
})

describe('HTTP Basic Auth (enabled)', () => {
  let server
  before(async () => {
    server = startServer(3095, { AUTH_USER: 'testadmin', AUTH_PASS: 'testpass123' })
    await waitForServer(server.baseUrl)
  })
  after(() => server.stop())

  test('rejects requests with no credentials', async () => {
    const res = await fetch(`${server.baseUrl}/api/cameras`)
    assert.equal(res.status, 401)
  })

  test('rejects wrong credentials', async () => {
    const res = await fetch(`${server.baseUrl}/api/cameras`, {
      headers: { Authorization: 'Basic ' + Buffer.from('wrong:wrong').toString('base64') },
    })
    assert.equal(res.status, 401)
  })

  test('accepts correct credentials', async () => {
    const res = await fetch(`${server.baseUrl}/api/cameras`, {
      headers: { Authorization: 'Basic ' + Buffer.from('testadmin:testpass123').toString('base64') },
    })
    assert.equal(res.status, 200)
  })
})
