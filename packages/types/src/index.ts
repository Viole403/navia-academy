import { JsonDataMap } from './json-data'

export type NavItem = {
  title: string
  href: string
  icon?: string
  items?: NavItem[]
}

export type SidebarNavItem = {
  title: string
  href: string
  icon?: string
  items?: NavItem[]
}

export type DashboardConfig = {
  mainNav: NavItem[]
  sidebarNav: SidebarNavItem[]
}

export type SearchableItem = {
  id: string
  type: 'vocabulary' | 'grammar' | 'character' | 'conversation'
  title: string
  description?: string
  tags?: string[]
  href: string
}

export type { JsonDataMap }
export * from './vocabulary'
export * from './grammar'
export * from './character'
export * from './conversation'
export * from './exam'
export * from './progress'
export * from './srs'
