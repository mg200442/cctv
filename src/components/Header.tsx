import { Search, Cctv, PauseCircle, PlayCircle, WifiOff, Wrench } from 'lucide-react'

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
  networkOk: boolean
  repairingNetwork: boolean
  onRepairNetwork: () => void
}

function pad(n: number) { return String(n).padStart(2, '0') }

const DIAS = ['DOM','LUN','MAR','MIE','JUE','VIE','SAB']
const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']

export function Header({
  now, serverOk, activeRecordings, camerasMax, camerasOnline, searchQuery, onSearch,
  allPaused, onToggleAllPaused,
  networkOk, repairingNetwork, onRepairNetwork,
}: Props) {
  const timeStr = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds())
  const dateStr = DIAS[now.getDay()] + ' ' + pad(now.getDate()) + ' ' + MESES[now.getMonth()] + ' ' + now.getFullYear()

  return (
    <header style={{
      height: 70, flexShrink: 0, borderBottom: '2px solid #20242A',
      background: '#0C0E10', display: 'flex', alignItems: 'center',
      padding: '0 22px', gap: 22,
    }}>
      {/* Brand */}
      <div>
        <div style={{ fontSize: 16, letterSpacing: '.14em', fontWeight: 500, color: '#ECE8E1' }}>
          SENTINEL<span style={{ color: '#E07820' }}>·</span>OPS
        </div>
        <div style={{ fontSize: 9, letterSpacing: '.14em', color: '#7E858C', marginTop: 2 }}>
          CENTRO DE MONITOREO
        </div>
      </div>

      {/* Status pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 14px', border: `2px solid ${serverOk ? '#20242A' : '#5A1F1B'}`,
        borderRadius: 999, background: serverOk ? '#0E1012' : '#1A0E0D',
      }}>
        <span
          className={serverOk ? 'live-dot' : ''}
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: serverOk ? '#36D399' : '#FF5247',
          }}
        />
        <span style={{
          fontSize: 10, letterSpacing: '.1em',
          color: serverOk ? '#36D399' : '#FF5247',
        }}>
          {serverOk ? 'SISTEMA OPERATIVO' : 'PROXY DESCONECTADO'}
        </span>
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
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 14px', border: '2px solid #5A1F1B', borderRadius: 999,
            background: '#1A0E0D', cursor: repairingNetwork ? 'default' : 'pointer',
            fontFamily: "'DM Mono', monospace",
          }}
        >
          <WifiOff size={13} color="#FF5247" />
          <span style={{ fontSize: 10, letterSpacing: '.1em', color: '#FF8079' }}>
            RED CÁMARA DESCONECTADA
          </span>
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
        flex: 1, maxWidth: 360, display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 14px', height: 40, border: `2px solid ${searchQuery ? '#E07820' : '#20242A'}`,
        borderRadius: 12, background: '#0E1012', color: '#565C63',
        transition: 'border-color .15s',
      }}>
        <Search size={16} color={searchQuery ? '#E07820' : '#565C63'} />
        <input
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
          placeholder="Buscar cámara, zona o fecha…"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
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
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Clock */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, letterSpacing: '.04em', color: '#ECE8E1' }}>
            {timeStr}
          </div>
          <div style={{ fontSize: 9, letterSpacing: '.12em', color: '#7E858C', marginTop: 1 }}>
            {dateStr}
          </div>
        </div>

        {/* Pause/resume all cameras — highlighted: this is the main lever to
            free up CPU on this machine when cameras aren't being watched. */}
        <button
          onClick={onToggleAllPaused}
          title={allPaused ? 'Reanudar todas las cámaras' : 'Pausar todas las cámaras (libera CPU)'}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
            border: `2px solid ${allPaused ? '#1f5a3a' : '#E07820'}`,
            background: allPaused ? '#0B1A14' : '#1A130A',
            color: allPaused ? '#36D399' : '#E07820',
            fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '.06em',
          }}
        >
          {allPaused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
          {allPaused ? 'REANUDAR TODO' : 'PAUSAR TODO'}
        </button>

        <div style={{ width: 2, height: 36, background: '#20242A' }} />

        {/* Camera count */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
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
