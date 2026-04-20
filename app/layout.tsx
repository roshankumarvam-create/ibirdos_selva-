import type { Metadata } from 'next'
import './globals.css'
import { ACTIVE_SESSION, PERMISSIONS } from './lib/auth'
export const metadata: Metadata = {
  title: 'iBirdOS — Restaurant Intelligence',
  description: 'AI-powered restaurant operating system',
}

// ── iBirdOS Role + Unit model (server-safe, no hooks) ──
const MOCK_USER = {
  name: 'Simbu Selvarasu',
  initials: 'SS',
  email: 'CEO@prosperityaxis.com',
  role: 'OWNER',
  tier: 'Restaurant',
  unit_id: 'RS-10001',
  unit_name: 'Cafe 71',
  tier_color: '#2563EB',
}

// Nav items filtered by role
// OWNER sees everything except IB_ADMIN tools
// STAFF sees only Orders + Waste
// SOLO sees their own unit only
const NAV = {
  overview: [
    { name: 'Dashboard',     href: '/',        roles: ['OWNER','MANAGER','SOLO','MU_DIRECTOR','FR_OWNER','EN_ADMIN','CAFE','LOUNGE','SCHOOL_DIR','CORP_DINING'] },
    { name: 'Daily Sales',   href: '/sales',   roles: ['OWNER','MANAGER','SOLO','CAFE','LOUNGE','SCHOOL_DIR','CORP_DINING'] },
    { name: 'Finance & P&L', href: '/finance', roles: ['OWNER','SOLO','MU_DIRECTOR','FR_OWNER','EN_ADMIN','EN_FINANCE','CAFE','LOUNGE','SCHOOL_DIR','CORP_DINING'] },
    { name: 'Reports',       href: '/reports', roles: ['OWNER','MANAGER','SOLO','MU_DIRECTOR','FR_OWNER','EN_ADMIN','EN_FINANCE'] },
    { name: 'Roadmap',       href: '/roadmap', roles: ['OWNER','EN_ADMIN','IB_ADMIN'] },
  ],
  ai_modules: [
    { name: 'Voice Orders',    href: '/voice-orders',  badge: 'Live', badgeColor: '#052E16', badgeText: '#86EFAC', roles: ['OWNER','MANAGER','STAFF','SOLO','CAFE','LOUNGE'] },
    { name: 'FDA Alerts',      href: '/fda-alerts',    badge: '2',    badgeColor: '#450A0A', badgeText: '#FCA5A5', roles: ['OWNER','MANAGER','SOLO','CAFE','LOUNGE','SCHOOL_DIR','CORP_DINING'] },
    { name: 'Invoices',        href: '/invoices',      badge: null,   roles: ['OWNER','MANAGER','SOLO','CAFE','LOUNGE'] },
    { name: 'Waste Log',       href: '/waste',         badge: null,   roles: ['OWNER','MANAGER','STAFF','CHEF','SOLO','CAFE','LOUNGE','SCHOOL_DIR','CORP_DINING'] },
    { name: 'Marketing AI',    href: '/marketing',     badge: null,   roles: ['OWNER','SOLO','MU_DIRECTOR','FR_OWNER','EN_ADMIN','CAFE','LOUNGE'] },
    { name: 'SEO & Reviews',   href: '/seo',           badge: null,   roles: ['OWNER','SOLO','MU_DIRECTOR','FR_OWNER','CAFE','LOUNGE'] },
    { name: 'Poster Designer', href: '/poster',        badge: 'New',  badgeColor: '#1E1B4B', badgeText: '#A5B4FC', roles: ['OWNER','SOLO','MU_DIRECTOR','FR_OWNER','CAFE','LOUNGE'] },
  ],
  culinary: [
    { name: 'Recipes',     href: '/recipes',     badge: null, roles: ['OWNER','MANAGER','STAFF','CHEF','SOLO','CAFE','LOUNGE','SCHOOL_DIR','CORP_DINING'] },
    { name: 'Menu Works',  href: '/menu',        badge: null, roles: ['OWNER','MANAGER','SOLO','CAFE','LOUNGE','SCHOOL_DIR','CORP_DINING'] },
    { name: 'Yield Log',   href: '/yield',       badge: null, roles: ['OWNER','MANAGER','STAFF','CHEF','SOLO'] },
    { name: 'Production',  href: '/production',  badge: null, roles: ['OWNER','MANAGER','STAFF','CHEF','SOLO','SCHOOL_DIR','CORP_DINING'] },
  ],
  multi_unit: [
    { name: 'All Units',      href: '/units',      badge: null, roles: ['MU_DIRECTOR','FR_OWNER','FR_CORP','EN_ADMIN','EN_FINANCE','IB_ADMIN'] },
    { name: 'Unit Compare',   href: '/compare',    badge: null, roles: ['MU_DIRECTOR','FR_OWNER','EN_ADMIN','IB_ADMIN'] },
    { name: 'Flash Reports',  href: '/flash',      badge: null, roles: ['MU_DIRECTOR','FR_OWNER','FR_CORP','EN_ADMIN','EN_FINANCE','IB_ADMIN'] },
  ],
  settings: [
    { name: 'Integrations', href: '/integrations', roles: ['OWNER','EN_ADMIN','MU_DIRECTOR','IB_ADMIN'] },
    { name: 'Team & Roles', href: '/team',         roles: ['OWNER','EN_ADMIN','MU_DIRECTOR','IB_ADMIN'] },
    { name: 'Settings',     href: '/settings',     roles: ['OWNER','SOLO','EN_ADMIN','IB_ADMIN'] },
  ],
}

// Tier color map
const TIER_COLORS: Record<string, string> = {
  'Solo Chef':       '#8B5CF6',
  'Restaurant':      '#2563EB',
  'Multi Unit':      '#059669',
  'Franchise':       '#D97706',
  'Enterprise':      '#DC2626',
  'School Dining':   '#06B6D4',
  'Corporate Dining':'#EC4899',
  'Lounge & Bar':    '#F97316',
  'Cafe':            '#10B981',
  'iBirdOS Admin':   '#EF4444',
}

// Section label component (server-side only, no state)
function NavSection({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: '10px', fontWeight: '600', color: '#334155',
      textTransform: 'uppercase' as const, letterSpacing: '0.08em',
      padding: '16px 8px 6px'
    }}>{label}</div>
  )
}

function NavLink({ name, href, badge, badgeColor, badgeText }: {
  name: string; href: string;
  badge?: string | null;
  badgeColor?: string;
  badgeText?: string;
}) {
  return (
    <a href={href} style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '9px 10px', borderRadius: '6px',
      color: '#94A3B8', fontSize: '13px',
      cursor: 'pointer', marginBottom: '2px',
      textDecoration: 'none',
    }}>
      <span>{name}</span>
      {badge && (
        <span style={{
          background: badgeColor || '#1E2A45',
          color: badgeText || '#94A3B8',
          fontSize: '10px', fontWeight: '600',
          padding: '1px 6px', borderRadius: '20px'
        }}>{badge}</span>
      )}
    </a>
  )
}

// Which nav sections to show for this role
const ROLE = MOCK_USER.role
const showMultiUnit = ['MU_DIRECTOR','FR_OWNER','FR_CORP','EN_ADMIN','EN_FINANCE','IB_ADMIN'].includes(ROLE)
const showCulinary = ['OWNER','MANAGER','STAFF','CHEF','SOLO','CAFE','LOUNGE','SCHOOL_DIR','CORP_DINING'].includes(ROLE)

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const tierColor = TIER_COLORS[MOCK_USER.tier] || '#2563EB'

  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      </head>
      <body
        style={{ fontFamily: 'Inter, sans-serif', margin: 0, background: '#060D1A' }}
        suppressHydrationWarning={true}
      >
        <div style={{ display: 'flex' }}>

          {/* ── SIDEBAR ── */}
          <div style={{
            width: '240px',
            background: '#0A0F1E',
            minHeight: '100vh',
            position: 'fixed',
            top: 0, left: 0, bottom: 0,
            borderRight: '1px solid #1E2A45',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100
          }}>

            {/* Logo + unit badge */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1E2A45' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '7px',
                  background: 'linear-gradient(135deg,#2563EB,#7C3AED)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', flexShrink: 0
                }}>🐦</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF', lineHeight: 1 }}>iBirdOS</div>
                  <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>Restaurant Intelligence</div>
                </div>
              </div>

              {/* Active unit pill */}
              <div style={{
                background: '#060D1A', border: `1px solid ${tierColor}40`,
                borderRadius: '8px', padding: '8px 10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: '700',
                    padding: '2px 7px', borderRadius: '4px',
                    background: tierColor, color: 'white'
                  }}>{MOCK_USER.tier}</span>
                  <code style={{
                    fontSize: '10px', fontWeight: '700',
                    color: tierColor,
                    background: `${tierColor}15`,
                    padding: '2px 6px', borderRadius: '4px'
                  }}>{MOCK_USER.unit_id}</code>
                </div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#E2E8F0' }}>{MOCK_USER.unit_name}</div>
              </div>
            </div>

            {/* Nav */}
            <nav style={{ padding: '8px 12px', flex: 1, overflowY: 'auto' }}>

              <NavSection label="Overview" />
              {NAV.overview
                .filter(i => i.roles.includes(ROLE))
                .map(i => <NavLink key={i.href} {...i} />)}

              <NavSection label="AI Modules" />
              {NAV.ai_modules
                .filter(i => i.roles.includes(ROLE))
                .map(i => <NavLink key={i.href} {...i} />)}

              {showCulinary && (
                <>
                  <NavSection label="Culinary" />
                  {NAV.culinary
                    .filter(i => i.roles.includes(ROLE))
                    .map(i => <NavLink key={i.href} {...i} />)}
                </>
              )}

              {showMultiUnit && (
                <>
                  <NavSection label="Multi-Unit" />
                  {NAV.multi_unit
                    .filter(i => i.roles.includes(ROLE))
                    .map(i => <NavLink key={i.href} {...i} />)}
                </>
              )}

              <NavSection label="Settings" />
              {NAV.settings
                .filter(i => i.roles.includes(ROLE))
                .map(i => <NavLink key={i.href} {...i} />)}

            </nav>

            {/* User footer */}
            <div style={{ padding: '14px 16px', borderTop: '1px solid #1E2A45' }}>

              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: `${tierColor}30`,
                  border: `1px solid ${tierColor}60`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '700', color: tierColor,
                  flexShrink: 0
                }}>{MOCK_USER.initials}</div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#FFFFFF', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{MOCK_USER.name}</div>
                  <div style={{ fontSize: '10px', color: '#475569' }}>{MOCK_USER.email}</div>
                </div>
              </div>

              {/* Role + unit badges */}
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' as const, marginBottom: '10px' }}>
                <span style={{
                  fontSize: '10px', fontWeight: '700',
                  padding: '2px 8px', borderRadius: '4px',
                  background: tierColor, color: 'white'
                }}>{MOCK_USER.role}</span>
                <span style={{
                  fontSize: '10px', fontWeight: '600',
                  padding: '2px 8px', borderRadius: '4px',
                  background: '#1E2A45', color: '#93C5FD'
                }}>{MOCK_USER.unit_id}</span>
              </div>

              {/* Sign out / switch */}
              <a href="/login" style={{
                display: 'block',
                textAlign: 'center' as const,
                fontSize: '12px', color: '#334155',
                textDecoration: 'none',
                padding: '7px',
                borderRadius: '6px',
                border: '1px solid #1E2A45',
                background: '#060D1A',
              }}>Switch Account / Sign Out</a>

            </div>
          </div>

          {/* ── PAGE CONTENT ── */}
          <div style={{ marginLeft: '240px', flex: 1, minHeight: '100vh' }}>
            {children}
          </div>

        </div>
      </body>
    </html>
  )
}