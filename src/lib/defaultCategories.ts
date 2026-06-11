import type { CategoryType } from './supabase'

export interface DefaultCategory {
  name: string
  icon: string
  type: CategoryType
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Fixed — monthly bills
  { name: 'Rent',               icon: '🏠', type: 'fixed' },
  { name: 'Electricity',        icon: '⚡', type: 'fixed' },
  // Recurring — cycle-based
  { name: 'Gas',                icon: '🔥', type: 'fixed' },
  { name: 'WiFi',               icon: '📡', type: 'fixed' },
  // Variable — regular spending
  { name: 'Groceries & ration', icon: '🛒', type: 'variable' },
  { name: 'Cravings',           icon: '🍕', type: 'variable' },
  // Irregular — occasional
  { name: 'Home essentials',    icon: '🪑', type: 'irregular' },
  { name: 'Medical',            icon: '💊', type: 'irregular' },
  { name: 'Lifestyle',          icon: '🎉', type: 'irregular' },
  { name: 'Security deposit',   icon: '🔐', type: 'irregular' },
]
