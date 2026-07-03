#!/usr/bin/env node
// Generates the PWA icon PNGs (public/icon-192.png, icon-512.png,
// apple-touch-icon.png) from scratch, pixel by pixel, with only Node's
// built-in zlib for the PNG DEFLATE step — no image library / no
// sharp/canvas dependency just for a handful of static icon files. Run
// once (`node scripts/generate-pwa-icons.mjs`) whenever the icon design
// changes; the output PNGs are committed to public/, this script doesn't
// run as part of the normal build.
//
// The mark itself is deliberately simple: a cyan filled circle on the
// app's dark card background, echoing the ShieldCheck badge color in
// Sidebar.tsx's logo — a placeholder brand mark, not real artwork, but a
// clean and on-theme one that doesn't need external tools to produce.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = join(__dirname, '..', 'public')

const BG = [0x0e, 0x10, 0x12] // card background
const FG = [0x38, 0xbd, 0xf8] // cyan accent (matches Sidebar.tsx's logo badge)

let crcTable
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  // filter byte 0 (none) prefixed to every scanline — simplest valid encoding
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw)
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// Centered filled circle at ~32% radius — comfortably inside the "safe
// zone" Android maskable icons crop to, so the same PNG works for both
// regular and maskable manifest entries without separate artwork.
function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.32
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const dx = x - cx
      const dy = y - cy
      const [cr, cg, cb] = dx * dx + dy * dy <= r * r ? FG : BG
      rgba[i] = cr
      rgba[i + 1] = cg
      rgba[i + 2] = cb
      rgba[i + 3] = 255
    }
  }
  return rgba
}

for (const size of [192, 512]) {
  const out = join(PUBLIC_DIR, `icon-${size}.png`)
  writeFileSync(out, encodePng(size, size, drawIcon(size)))
  console.log(`  wrote ${out}`)
}
const appleOut = join(PUBLIC_DIR, 'apple-touch-icon.png')
writeFileSync(appleOut, encodePng(180, 180, drawIcon(180)))
console.log(`  wrote ${appleOut}`)
