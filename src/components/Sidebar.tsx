import { ShieldCheck, LayoutGrid, Clapperboard, Bell, Activity, MapPin, Cctv, Settings } from 'lucide-react'

type NavItem = {
  icon: React.ElementType
  label: string
  view: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutGrid, label: 'EN VIVO', view: 'live' },
  { icon: Clapperboard, label: 'REC', view: 'rec' },
  { icon: Bell, label: 'ALERTAS', view: 'alertas' },
  { icon: Activity, label: 'IA', view: 'ia' },
  { icon: MapPin, label: 'MAPA', view: 'mapa' },
  { icon: Cctv, label: 'EQUIPOS', view: 'equipos' },
]

interface Props {
  activeView: string
  alertsBadge?: number
  onNav: (view: string) => void
  onOpenSettings: () => void
}

export function Sidebar({ activeView, alertsBadge, onNav, onOpenSettings }: Props) {
  return (
    <aside style={{
      width: 84, flexShrink: 0, background: '#0E1012',
      borderRight: '2px solid #20242A', display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '18px 0',
    }}>
      {/* Logo — cyan to differentiate from orange nav items */}
      <div style={{
        width: 48, height: 48, border: '2px solid #38BDF8', borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#38BDF8', background: '#071420', marginBottom: 26,
        position: 'relative',
      }}>
        <ShieldCheck size={24} />
        <span style={{
          position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
          fontSize: 6, letterSpacing: '.08em', color: '#38BDF8',
          background: '#0E1012', padding: '0 3px', whiteSpace: 'nowrap',
        }}>
          SENTINEL
        </span>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', width: '100%' }}>
        {NAV_ITEMS.map(({ icon: Icon, label, view }) => {
          const active = activeView === view
          const badge = view === 'alertas' ? alertsBadge : undefined
          return (
            <button
              key={label}
              onClick={() => onNav(view)}
              style={{
                position: 'relative', width: 56, height: 56, borderRadius: 12,
                border: active ? '2px solid #E07820' : '2px solid #20242A',
                background: active ? '#1A130A' : 'transparent',
                color: active ? '#E07820' : '#7E858C',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 3, cursor: 'pointer',
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize: 7, letterSpacing: '.06em', fontFamily: 'inherit' }}>{label}</span>
              {badge !== undefined && badge > 0 && (
                <span style={{
                  position: 'absolute', top: 6, right: 8, width: 16, height: 16,
                  borderRadius: '50%', background: '#FF5247', color: '#fff',
                  fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid #08090A',
                }}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button
          onClick={onOpenSettings}
          title="Configuración"
          style={{
            width: 56, height: 56, borderRadius: 12, border: '2px solid #20242A',
            background: 'transparent', color: '#7E858C',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <Settings size={20} />
        </button>
        <div style={{
          width: 44, height: 44, borderRadius: 12, border: '2px solid #2A2E33',
          background: '#20242A', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: '#ECE8E1', letterSpacing: '.04em',
        }}>
          MG
        </div>
      </div>
    </aside>
  )
}
