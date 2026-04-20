export type UserRole =
  | 'OWNER' | 'MANAGER' | 'CHEF' | 'STAFF' | 'SOLO'
  | 'MU_DIRECTOR' | 'FR_OWNER' | 'EN_ADMIN'
  | 'SCHOOL_DIR' | 'CORP_DINING' | 'LOUNGE' | 'CAFE'
  | 'IB_ADMIN'

export interface Session {
  user_id: string
  name: string
  initials: string
  email: string
  role: UserRole
  company_id: string
  company_name: string
  parent_company?: string
  unit_id: string
  unit_name: string
  location: string
  allowed_unit_ids: string[]
  tier_label: string
  tier_color: string
}

export const PERMISSIONS: Record<UserRole, {
  dashboard: string
  canViewFinancials: boolean
  canEditSales: boolean
  canViewPL: boolean
  canViewWaste: boolean
  canViewRecipes: boolean
  canViewAllUnits: boolean
  canManageUsers: boolean
  canViewOtherCompanies: boolean
  showUnitSelector: boolean
}> = {
  OWNER:       { dashboard: '/',                     canViewFinancials: true,  canEditSales: true,  canViewPL: true,  canViewWaste: true,  canViewRecipes: true,  canViewAllUnits: false, canManageUsers: true,  canViewOtherCompanies: false, showUnitSelector: false },
  MANAGER:     { dashboard: '/',                     canViewFinancials: true,  canEditSales: true,  canViewPL: false, canViewWaste: true,  canViewRecipes: true,  canViewAllUnits: false, canManageUsers: false, canViewOtherCompanies: false, showUnitSelector: false },
  CHEF:        { dashboard: '/dashboard/kitchen',    canViewFinancials: false, canEditSales: false, canViewPL: false, canViewWaste: true,  canViewRecipes: true,  canViewAllUnits: false, canManageUsers: false, canViewOtherCompanies: false, showUnitSelector: false },
  STAFF:       { dashboard: '/dashboard/staff',      canViewFinancials: false, canEditSales: false, canViewPL: false, canViewWaste: true,  canViewRecipes: false, canViewAllUnits: false, canManageUsers: false, canViewOtherCompanies: false, showUnitSelector: false },
  SOLO:        { dashboard: '/',                     canViewFinancials: true,  canEditSales: true,  canViewPL: true,  canViewWaste: true,  canViewRecipes: true,  canViewAllUnits: false, canManageUsers: false, canViewOtherCompanies: false, showUnitSelector: false },
  MU_DIRECTOR: { dashboard: '/dashboard/multi-unit', canViewFinancials: true,  canEditSales: false, canViewPL: true,  canViewWaste: true,  canViewRecipes: false, canViewAllUnits: true,  canManageUsers: true,  canViewOtherCompanies: false, showUnitSelector: true  },
  FR_OWNER:    { dashboard: '/dashboard/franchise',  canViewFinancials: true,  canEditSales: false, canViewPL: true,  canViewWaste: true,  canViewRecipes: false, canViewAllUnits: true,  canManageUsers: true,  canViewOtherCompanies: false, showUnitSelector: true  },
  EN_ADMIN:    { dashboard: '/dashboard/enterprise', canViewFinancials: true,  canEditSales: false, canViewPL: true,  canViewWaste: true,  canViewRecipes: false, canViewAllUnits: true,  canManageUsers: true,  canViewOtherCompanies: false, showUnitSelector: true  },
  SCHOOL_DIR:  { dashboard: '/',                     canViewFinancials: true,  canEditSales: true,  canViewPL: true,  canViewWaste: true,  canViewRecipes: true,  canViewAllUnits: false, canManageUsers: true,  canViewOtherCompanies: false, showUnitSelector: false },
  CORP_DINING: { dashboard: '/',                     canViewFinancials: true,  canEditSales: true,  canViewPL: true,  canViewWaste: true,  canViewRecipes: true,  canViewAllUnits: false, canManageUsers: true,  canViewOtherCompanies: false, showUnitSelector: false },
  LOUNGE:      { dashboard: '/',                     canViewFinancials: true,  canEditSales: true,  canViewPL: true,  canViewWaste: true,  canViewRecipes: true,  canViewAllUnits: false, canManageUsers: true,  canViewOtherCompanies: false, showUnitSelector: false },
  CAFE:        { dashboard: '/',                     canViewFinancials: true,  canEditSales: true,  canViewPL: true,  canViewWaste: true,  canViewRecipes: true,  canViewAllUnits: false, canManageUsers: true,  canViewOtherCompanies: false, showUnitSelector: false },
  IB_ADMIN:    { dashboard: '/dashboard/admin',      canViewFinancials: true,  canEditSales: true,  canViewPL: true,  canViewWaste: true,  canViewRecipes: true,  canViewAllUnits: true,  canManageUsers: true,  canViewOtherCompanies: true,  showUnitSelector: true  },
}

export const DEMO_SESSIONS: Record<string, Session> = {
  'owner@cafe71.com':      { user_id: 'u001', name: 'Simbu Selvarasu', initials: 'SS', email: 'owner@cafe71.com',      role: 'OWNER',       company_id: 'comp_cafe71', company_name: 'Cafe 71',              unit_id: 'RS-10001', unit_name: 'Cafe 71 Redmond',      location: 'Redmond, WA',   allowed_unit_ids: ['RS-10001'],                                            tier_label: 'Restaurant',    tier_color: '#2563EB' },
  'manager@cafe71.com':    { user_id: 'u002', name: 'Priya Kumar',     initials: 'PK', email: 'manager@cafe71.com',    role: 'MANAGER',     company_id: 'comp_cafe71', company_name: 'Cafe 71',              unit_id: 'RS-10001', unit_name: 'Cafe 71 Redmond',      location: 'Redmond, WA',   allowed_unit_ids: ['RS-10001'],                                            tier_label: 'Restaurant',    tier_color: '#2563EB' },
  'chef@cafe71.com':       { user_id: 'u003', name: 'Chef Rajan',      initials: 'CR', email: 'chef@cafe71.com',       role: 'CHEF',        company_id: 'comp_cafe71', company_name: 'Cafe 71',              unit_id: 'RS-10001', unit_name: 'Cafe 71 Redmond',      location: 'Redmond, WA',   allowed_unit_ids: ['RS-10001'],                                            tier_label: 'Restaurant',    tier_color: '#2563EB' },
  'staff@cafe71.com':      { user_id: 'u004', name: 'Ana Gomez',       initials: 'AG', email: 'staff@cafe71.com',      role: 'STAFF',       company_id: 'comp_cafe71', company_name: 'Cafe 71',              unit_id: 'RS-10001', unit_name: 'Cafe 71 Redmond',      location: 'Redmond, WA',   allowed_unit_ids: ['RS-10001'],                                            tier_label: 'Restaurant',    tier_color: '#2563EB' },
  'chef@solo.com':         { user_id: 'u005', name: 'Chef Simbu',      initials: 'CS', email: 'chef@solo.com',         role: 'SOLO',        company_id: 'comp_solo',   company_name: 'Spice Route Kitchen',  unit_id: 'SC-71001', unit_name: 'Spice Route Kitchen',  location: 'Issaquah, WA',  allowed_unit_ids: ['SC-71001'],                                            tier_label: 'Solo Chef',     tier_color: '#8B5CF6' },
  'director@ansgroup.com': { user_id: 'u006', name: 'ANS Director',    initials: 'AD', email: 'director@ansgroup.com', role: 'MU_DIRECTOR', company_id: 'comp_ans',    company_name: 'ANS Pacific Group',   unit_id: 'MU-20001', unit_name: 'ANS Pacific Group',    location: 'Seattle, WA',   allowed_unit_ids: ['RS-10001','RS-10002'], parent_company: 'ANS Corp', tier_label: 'Multi Unit',    tier_color: '#059669' },
  'owner@spiceroute.com':  { user_id: 'u007', name: 'Franchise Owner', initials: 'FO', email: 'owner@spiceroute.com',  role: 'FR_OWNER',    company_id: 'comp_sr',     company_name: 'Spice Route',          unit_id: 'FR-30001', unit_name: 'Spice Route Unit 1',   location: 'Bellevue, WA',  allowed_unit_ids: ['FR-30001','FR-30002'],parent_company: 'SR Corp',   tier_label: 'Franchise',     tier_color: '#D97706' },
  'admin@anscorp.com':     { user_id: 'u008', name: 'Corp Admin',      initials: 'CA', email: 'admin@anscorp.com',     role: 'EN_ADMIN',    company_id: 'comp_corp',   company_name: 'ANS Corporation',      unit_id: 'EN-40001', unit_name: 'ANS Corp HQ',          location: 'Redmond, WA',   allowed_unit_ids: ['RS-10001','RS-10002','MU-20001','FR-30001','FR-30002'], tier_label: 'Enterprise',    tier_color: '#DC2626' },
  'dining@school.edu':     { user_id: 'u009', name: 'School Director', initials: 'SD', email: 'dining@school.edu',     role: 'SCHOOL_DIR',  company_id: 'comp_school', company_name: 'Redmond School Dist',  unit_id: 'SD-50001', unit_name: 'District Dining',      location: 'Redmond, WA',   allowed_unit_ids: ['SD-50001'],                                            tier_label: 'School Dining', tier_color: '#06B6D4' },
  'lounge@venue.com':      { user_id: 'u010', name: 'Lounge Owner',    initials: 'LO', email: 'lounge@venue.com',      role: 'LOUNGE',      company_id: 'comp_lounge', company_name: 'Sky Lounge',           unit_id: 'LB-60001', unit_name: 'Sky Lounge Bellevue',  location: 'Bellevue, WA',  allowed_unit_ids: ['LB-60001'],                                            tier_label: 'Lounge & Bar',  tier_color: '#EC4899' },
  'admin@ibirdos.com':     { user_id: 'ib01', name: 'iBirdOS Admin',   initials: 'IB', email: 'admin@ibirdos.com',     role: 'IB_ADMIN',    company_id: 'ibirdos',     company_name: 'iBirdOS Platform',     unit_id: 'IB-00001', unit_name: 'iBirdOS Internal',     location: 'Redmond, WA',   allowed_unit_ids: ['ALL'],                                                 tier_label: 'iBirdOS Admin', tier_color: '#EF4444' },
}

// Change this email to test different roles
export const ACTIVE_SESSION: Session = DEMO_SESSIONS['owner@cafe71.com']