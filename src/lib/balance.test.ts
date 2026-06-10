import { describe, it, expect } from 'vitest'
import { nonPayerShare, computeBalance } from './balance'
import type { Expense, Settlement } from './supabase'

const A = 'profile-a'
const B = 'profile-b'
const HH = 'household-1'

function makeExpense(
  overrides: Partial<Expense> & { amount: number; paid_by: string },
): Expense {
  return {
    id: crypto.randomUUID(),
    household_id: HH,
    category_id: null,
    split_type: 'equal',
    split_ratio: null,
    note: null,
    spent_on: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeSettlement(from: string, to: string, amount: number): Settlement {
  return {
    id: crypto.randomUUID(),
    household_id: HH,
    amount,
    from_profile: from,
    to_profile: to,
    settled_on: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
  }
}

describe('nonPayerShare', () => {
  it('equal split: each pays half', () => {
    expect(nonPayerShare(100, 'equal', null)).toBe(50)
  })

  it('mine: non-payer owes nothing', () => {
    expect(nonPayerShare(200, 'mine', null)).toBe(0)
  })

  it('theirs: non-payer owes full amount', () => {
    expect(nonPayerShare(300, 'theirs', null)).toBe(300)
  })

  it('custom 70/30 split: non-payer owes 30%', () => {
    expect(nonPayerShare(100, 'custom', 70)).toBeCloseTo(30)
  })

  it('custom 100% payer: non-payer owes 0', () => {
    expect(nonPayerShare(100, 'custom', 100)).toBeCloseTo(0)
  })
})

describe('computeBalance', () => {
  it('no expenses → settled', () => {
    const result = computeBalance(A, B, [], [])
    expect(result.direction).toBe('settled')
    expect(result.amount).toBe(0)
  })

  it('A paid ₹100 equal → B owes ₹50', () => {
    const expenses = [makeExpense({ amount: 100, paid_by: A })]
    const result = computeBalance(A, B, expenses, [])
    expect(result.direction).toBe('bOwes')
    expect(result.amount).toBeCloseTo(50)
  })

  it('B paid ₹100 equal → A owes ₹50', () => {
    const expenses = [makeExpense({ amount: 100, paid_by: B })]
    const result = computeBalance(A, B, expenses, [])
    expect(result.direction).toBe('aOwes')
    expect(result.amount).toBeCloseTo(50)
  })

  it('A paid mine only → no debt', () => {
    const expenses = [makeExpense({ amount: 100, paid_by: A, split_type: 'mine' })]
    const result = computeBalance(A, B, expenses, [])
    expect(result.direction).toBe('settled')
  })

  it('A paid theirs → B owes full 100', () => {
    const expenses = [makeExpense({ amount: 100, paid_by: A, split_type: 'theirs' })]
    const result = computeBalance(A, B, expenses, [])
    expect(result.direction).toBe('bOwes')
    expect(result.amount).toBeCloseTo(100)
  })

  it('settlement reduces debt', () => {
    const expenses = [makeExpense({ amount: 100, paid_by: A })]
    const settlements = [makeSettlement(B, A, 50)] // B paid back A
    const result = computeBalance(A, B, expenses, settlements)
    expect(result.direction).toBe('settled')
    expect(result.amount).toBeCloseTo(0)
  })

  it('settlement that overshoots flips direction', () => {
    const expenses = [makeExpense({ amount: 100, paid_by: A })]
    const settlements = [makeSettlement(B, A, 70)]
    const result = computeBalance(A, B, expenses, settlements)
    expect(result.direction).toBe('aOwes')
    expect(result.amount).toBeCloseTo(20)
  })

  it('both paid equal amounts → net settled', () => {
    const expenses = [
      makeExpense({ amount: 100, paid_by: A }),
      makeExpense({ amount: 100, paid_by: B }),
    ]
    const result = computeBalance(A, B, expenses, [])
    expect(result.direction).toBe('settled')
  })
})
