import type { CategoryType } from './supabase'

export interface DefaultCategory {
  name: string
  icon: string
  type: CategoryType
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Fixed
  { name: 'Rent', icon: '🏠', type: 'fixed' },
  { name: 'Furlenco/Rentals', icon: '🪑', type: 'fixed' },
  { name: 'WiFi', icon: '📡', type: 'fixed' },
  { name: 'Electricity', icon: '⚡', type: 'fixed' },
  { name: 'Gas cylinder', icon: '🔥', type: 'fixed' },
  { name: 'Subscriptions', icon: '📺', type: 'fixed' },
  // Variable
  { name: 'Groceries', icon: '🛒', type: 'variable' },
  { name: 'Vegetables & fruits', icon: '🥦', type: 'variable' },
  { name: 'Dairy', icon: '🥛', type: 'variable' },
  { name: 'Eating out', icon: '🍽️', type: 'variable' },
  { name: 'Ordering in', icon: '🛵', type: 'variable' },
  { name: 'Transport', icon: '🚗', type: 'variable' },
  { name: 'Household supplies', icon: '🧹', type: 'variable' },
  { name: 'Personal care', icon: '🧴', type: 'variable' },
  { name: 'Medical/Pharmacy', icon: '💊', type: 'variable' },
  { name: 'Phone recharge', icon: '📱', type: 'variable' },
  // Irregular
  { name: 'Home setup', icon: '🔧', type: 'irregular' },
  { name: 'Repairs', icon: '🛠️', type: 'irregular' },
  { name: 'Gifts & occasions', icon: '🎁', type: 'irregular' },
  { name: 'Travel', icon: '✈️', type: 'irregular' },
  { name: 'Clothing', icon: '👕', type: 'irregular' },
  { name: 'Emergency', icon: '🚨', type: 'irregular' },
]
