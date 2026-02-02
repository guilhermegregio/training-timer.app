import { $$, $id } from '@/utils'
import { renderLibrary } from './library'

export type TabName = 'timers' | 'library' | 'settings'

const TABS: TabName[] = ['timers', 'library', 'settings']

export function switchTab(tab: TabName): void {
  $$('.tab').forEach((t) => {
    t.classList.remove('active')
  })
  $$('.nav-item').forEach((n) => {
    n.classList.remove('active')
  })

  const tabEl = $id(`tab-${tab}`)
  if (tabEl) tabEl.classList.add('active')

  const navItems = $$('.nav-item')
  const tabIndex = TABS.indexOf(tab)
  const navItem = navItems[tabIndex]
  if (navItem) navItem.classList.add('active')

  if (tab === 'library') renderLibrary()
}
