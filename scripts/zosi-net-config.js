#!/usr/bin/env node
// Reconfigure the persistent network settings of a Zosi ZG2323M (and likely
// other HiSilicon/HiLinux-based Zosi units) over telnet, so the change
// survives a reboot — a plain `ifconfig` on the camera does NOT persist,
// it gets overwritten by /config/NetCfgParam.CFG on next boot.
//
// Usage:
//   node scripts/zosi-net-config.js <camera-ip> --static <new-ip> [--gateway <gw>] [--netmask <mask>]
//   node scripts/zosi-net-config.js <camera-ip> --dhcp
//
// Examples:
//   node scripts/zosi-net-config.js 192.168.147.15 --static 192.168.138.15 --gateway 192.168.138.1
//   node scripts/zosi-net-config.js 192.168.147.15 --dhcp
//
// Requires the camera to already be reachable at <camera-ip> (i.e. the Mac
// needs a route to that subnet — see CLAUDE.md "Checklist al empezar sesión").
// Telnet credentials (root/123456asj) are the known default for this batch
// of cameras — see ~/Documents/obsidian/zosi.md for how they were found.

import net from 'net'

const TELNET_USER = 'root'
const TELNET_PASS = '123456asj'
const TELNET_PORT = 23

function parseArgs(argv) {
  const [ip, ...rest] = argv
  if (!ip) usage()
  const opts = { ip }
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--dhcp') opts.dhcp = true
    else if (rest[i] === '--static') opts.staticIp = rest[++i]
    else if (rest[i] === '--gateway') opts.gateway = rest[++i]
    else if (rest[i] === '--netmask') opts.netmask = rest[++i]
  }
  if (!opts.dhcp && !opts.staticIp) usage()
  if (opts.staticIp && !opts.gateway) {
    // Default gateway = same /24, .1 — matches how cam-01/cam-02 are set up
    opts.gateway = opts.staticIp.replace(/\.\d+$/, '.1')
  }
  opts.netmask ??= '255.255.255.0'
  return opts
}

function usage() {
  console.error('Usage: node zosi-net-config.js <camera-ip> --static <new-ip> [--gateway <gw>] [--netmask <mask>]')
  console.error('       node zosi-net-config.js <camera-ip> --dhcp')
  process.exit(1)
}

// Minimal telnet session: this camera's telnetd (BusyBox) doesn't need real
// IAC option negotiation for a simple login+shell session — plain writes
// with a short settle delay between commands is sufficient (verified
// interactively against cam-01/cam-02 this session).
function telnetSession(ip, commands) {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection({ host: ip, port: TELNET_PORT, timeout: 8000 })
    let buf = ''
    const log = []
    let step = 0

    const script = [
      { wait: 800, send: TELNET_USER + '\n' },
      { wait: 800, send: TELNET_PASS + '\n' },
      ...commands.map(c => ({ wait: 1200, send: c + '\n' })),
    ]

    function next() {
      if (step >= script.length) { sock.end(); return resolve(log) }
      const { wait, send } = script[step++]
      setTimeout(() => { sock.write(send); next() }, wait)
    }

    sock.on('connect', () => next())
    sock.on('data', d => { buf += d.toString(); log.push(d.toString()) })
    sock.on('error', reject)
    sock.on('timeout', () => { sock.destroy(); reject(new Error('telnet timeout')) })
  })
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  console.log(`Connecting to ${opts.ip}:23 ...`)

  const commands = ['cat /proc/uptime']
  if (opts.dhcp) {
    commands.push(
      'cp /config/NetCfgParam.CFG /config/NetCfgParam.CFG.bak',
      `sed -i 's/"EnDHCP":\\t0/"EnDHCP":\\t1/' /config/NetCfgParam.CFG`,
      'cat /config/NetCfgParam.CFG',
    )
  } else {
    // Read current values first isn't needed — sed replaces whatever IP is
    // there today with the new one; caller must pass the camera's CURRENT
    // live IP for --gateway matching to make sense if unsure, check first.
    commands.push(
      'cp /config/NetCfgParam.CFG /config/NetCfgParam.CFG.bak',
      `sed -i 's/"IPAddr":\\t"[0-9.]*"/"IPAddr":\\t"${opts.staticIp}"/g; s/"Gateway":\\t"[0-9.]*"/"Gateway":\\t"${opts.gateway}"/g' /config/NetCfgParam.CFG`,
      'cat /config/NetCfgParam.CFG',
    )
  }
  commands.push('reboot')

  const log = await telnetSession(opts.ip, commands)
  console.log(log.join(''))
  console.log(opts.dhcp
    ? `Done. Camera rebooting with DHCP enabled — check your router's client list for its new IP.`
    : `Done. Camera rebooting — should come back at ${opts.staticIp} in ~30-45s.`)
}

main().catch(err => { console.error('Failed:', err.message); process.exit(1) })
