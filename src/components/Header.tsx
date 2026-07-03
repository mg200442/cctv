import { Search, Cctv, PauseCircle, PlayCircle, Radar, WifiOff, Wrench } from 'lucide-react'
import { useLayoutMode } from '@/hooks/useLayoutMode'

interface Props {
  now: Date
  serverOk: boolean
  activeRecordings: number
  camerasMax: number
  camerasOnline: number
  searchQuery: string
  onSearch: (q: string) => void
  allPaused: boolean
  onToggleAllPaused: () => void
  motionActive: boolean
  onToggleMotion: () => void
  networkOk: boolean
  repairingNetwork: boolean
  onRepairNetwork: () => void
}

function pad(n: number) { return String(n).padStart(2, '0') }

const DIAS = ['DOM','LUN','MAR','MIE','JUE','VIE','SAB']
const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']

export function Header({
  now, serverOk, activeRecordings, camerasMax, camerasOnline, searchQuery, onSearch,
  allPaused, onToggleAllPaused, motionActive, onToggleMotion,
  networkOk, repairingNetwork, onRepairNetwork,
}: Props) {
  const timeStr = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds())
  const dateStr = DIAS[now.getDay()] + ' ' + pad(now.getDate()) + ' ' + MESES[now.getMonth()] + ' ' + now.getFullYear()
  const layoutMode = useLayoutMode()
  const isMobile = layoutMode === 'mobile'

  return (
    <header style={{
      height: isMobile ? 54 : 70, flexShrink: 0, borderBottom: '2px solid #20242A',
      background: '#0C0E10', display: 'flex', alignItems: 'center',
      padding: isMobile ? '0 12px' : '0 22px', gap: isMobile ? 10 : 22,
      // Safety net, not a design goal — on a phone this row can't fully
      // avoid feeling tight (server status, network-repair alert, search,
      // clock and 4 more controls all genuinely compete for the same row).
      // Icon-only buttons and dropped subtitles below handle the common
      // case; horizontal scroll means the rare case (e.g. the network-repair
      // pill appearing) degrades to a swipe instead of overlapping content.
      overflowX: isMobile ? 'auto' : 'visible',
    }}>
      {/* Brand */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: isMobile ? 13 : 16, letterSpacing: '.14em', fontWeight: 500, color: '#ECE8E1' }}>
          SENTINEL<span style={{ color: '#E07820' }}>·</span>OPS
        </div>
        {!isMobile && (
          <div style={{ fontSize: 9, letterSpacing: '.14em', color: '#7E858C', marginTop: 2 }}>
            CENTRO DE MONITOREO
          </div>
        )}
      </div>

      {/* Status pill — dot only on mobile, the label text just repeats what
          the dot color already says and there's no room to spare. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        padding: isMobile ? '7px 8px' : '7px 14px', border: `2px solid ${serverOk ? '#20242A' : '#5A1F1B'}`,
        borderRadius: 999, background: serverOk ? '#0E1012' : '#1A0E0D',
      }}>
        <span
          className={serverOk ? 'live-dot' : ''}
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: serverOk ? '#36D399' : '#FF5247',
          }}
        />
        {!isMobile && (
          <span style={{
            fontSize: 10, letterSpacing: '.1em',
            color: serverOk ? '#36D399' : '#FF5247',
          }}>
            {serverOk ? 'SISTEMA OPERATIVO' : 'PROXY DESCONECTADO'}
          </span>
        )}
      </div>

      {/* Network alias pill — only shown once the proxy is reachable but the
          camera subnet alias is missing (lost on Mac reboot/logout, see
          CLAUDE.md). Lets the operator fix it without a terminal/AI session. */}
      {serverOk && !networkOk && (
        <button
          onClick={onRepairNetwork}
          disabled={repairingNetwork}
          title="Configura el alias de red hacia la subred de la cámara (192.168.138.x). Puede pedir la contraseña de administrador."
          style={{
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            padding: '7px 14px', border: '2px solid #5A1F1B', borderRadius: 999,
            background: '#1A0E0D', cursor: repairingNetwork ? 'default' : 'pointer',
            fontFamily: "'DM Mono', monospace",
          }}
        >
          <WifiOff size={13} color="#FF5247" />
          {!isMobile && (
            <span style={{ fontSize: 10, letterSpacing: '.1em', color: '#FF8079' }}>
              RED CÁMARA DESCONECTADA
            </span>
          )}
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 10, letterSpacing: '.06em', color: '#FF5247',
            borderLeft: '2px solid #5A1F1B', paddingLeft: 8,
          }}>
            <Wrench size={12} className={repairingNetwork ? 'live-dot' : ''} />
            {repairingNetwork ? 'REPARANDO…' : 'REPARAR'}
          </span>
        </button>
      )}

      {/* Search */}
      <label style={{
        flex: 1, maxWidth: isMobile ? 160 : 360, minWidth: isMobile ? 90 : undefined,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 14px', height: 40, border: `2px solid ${searchQuery ? '#E07820' : '#20242A'}`,
        borderRadius: 12, background: '#0E1012', color: '#565C63',
        transition: 'border-color .15s',
      }}>
        <Search size={16} color={searchQuery ? '#E07820' : '#565C63'} />
        <input
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
          placeholder={isMobile ? 'Buscar…' : 'Buscar cámara, zona o fecha…'}
          style={{
            flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
            color: '#ECE8E1', fontFamily: "'DM Mono', monospace", fontSize: 12,
          }}
        />
        {searchQuery && (
          <button
            onClick={() => onSearch('')}
            style={{
              background: 'none', border: 'none', color: '#7E858C',
              cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0,
            }}
          >
            ×
          </button>
        )}
      </label>

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 20, flexShrink: 0 }}>
        {/* Clock — date subtitle dropped on mobile, same reasoning as the
            brand subtitle above. */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: isMobile ? 15 : 22, letterSpacing: '.04em', color: '#ECE8E1' }}>
            {timeStr}
          </div>
          {!isMobile && (
            <div style={{ fontSize: 9, letterSpacing: '.12em', color: '#7E858C', marginTop: 1 }}>
              {dateStr}
            </div>
          )}
        </div>

        {/* Pause/resume all cameras — highlighted: this is the main lever to
            free up CPU on this machine when cameras aren't being watched.
            Icon-only on mobile — title= still carries the full label for
            anyone using a pointer (trackpad-connected iPad, say). */}
        <button
          onClick={onToggleAllPaused}
          title={allPaused ? 'Reanudar todas las cámaras' : 'Pausar todas las cámaras (libera CPU)'}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
            padding: isMobile ? '8px' : '8px 14px', borderRadius: 12, cursor: 'pointer',
            border: `2px solid ${allPaused ? '#1f5a3a' : '#E07820'}`,
            background: allPaused ? '#0B1A14' : '#1A130A',
            color: allPaused ? '#36D399' : '#E07820',
            fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '.06em',
          }}
        >
          {allPaused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
          {!isMobile && (allPaused ? 'REANUDAR TODO' : 'PAUSAR TODO')}
        </button>

        {/* Motion detection — global start/pause across all cameras. Also
            available inside Alertas → Movimiento, but kept here too so it's
            reachable as a quick toggle regardless of which view is open. */}
        <button
          onClick={onToggleMotion}
          title={motionActive ? 'Pausar detección de movimiento' : 'Iniciar detección de movimiento'}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
            padding: isMobile ? '8px' : '8px 14px', borderRadius: 12, cursor: 'pointer',
            border: `2px solid ${motionActive ? '#38BDF8' : '#20242A'}`,
            background: motionActive ? '#0B1620' : '#0E1012',
            color: motionActive ? '#38BDF8' : '#7E858C',
            fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '.06em',
          }}
        >
          <Radar size={16} className={motionActive ? 'live-dot' : ''} />
          {!isMobile && (motionActive ? 'DETECCIÓN ACTIVA' : 'DETECTAR MOVIMIENTO')}
        </button>

        {!isMobile && <div style={{ width: 2, height: 36, background: '#20242A' }} />}

        {/* Camera count */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          padding: '8px 14px', border: '2px solid #20242A', borderRadius: 12,
        }}>
          <Cctv size={16} color="#36D399" />
          <span style={{ fontSize: 13, color: '#ECE8E1' }}>
            {camerasOnline}<span style={{ color: '#565C63' }}>/{camerasMax}</span>
          </span>
        </div>

        {activeRecordings > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', border: '2px solid #5A1F1B',
            borderRadius: 12, background: '#1A0E0D',
          }}>
            <span className="rec-blink" style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5247' }} />
            <span style={{ fontSize: 11, letterSpacing: '.1em', color: '#FF8079' }}>
              REC ×{activeRecordings}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
