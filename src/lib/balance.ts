import type { Expense, Settlement, SplitType } from './supabase'

export interface BalanceResult {
  /** Positive = person A owes person B; negative = person B owes person A */
  net: number
  /** Who owes whom, and how much (always positive) */
  direction: 'settled' | 'aOwes' | 'bOwes'
  amount: number
}

/**
 * Compute how much the non-payer owes for a single expense.
 * Returns the amount the *non-payer* owes the payer.
 */
export function nonPayerShare(
  amount: number,
  splitType: SplitType,
  splitRatio: number | null,
): number {
  switch (splitType) {
    case 'equal':
      return amount / 2
    case 'custom': {
      // splitRatio is payer's share %; non-payer owes the remainder
      const payerPct = splitRatio ?? 50
      return amount * (100 - payerPct) / 100
    }
    case 'mine':
      // Entirely the payer's expense — non-payer owes nothing
      return 0
    case 'theirs':
      // Entirely attributed to the other person — non-payer owes full amount
      return amount
  }
}

/**
 * Compute the net balance between two people given their expenses and settlements.
 *
 * Returns a positive number when personB owes personA, and negative when personA owes personB.
 * Direction tells you who owes whom in human-readable form.
 *
 * @param personA  First profile id
 * @param personB  Second profile id
 * @param expenses All household expenses (only those paid by A or B are used)
 * @param settlements All household settlements
 */
export function computeBalance(
  personA: string,
  personB: string,
  expenses: Expense[],
  settlements: Settlement[],
): BalanceResult {
  let net = 0 // positive = B owes A

  for (const e of expenses) {
    const share = nonPayerShare(e.amount, e.split_type, e.split_ratio)

    if (e.paid_by === personA) {
      // A paid; B owes A share
      net += share
    } else if (e.paid_by === personB) {
      // B paid; A owes B share → net decreases
      net -= share
    }
    // expenses by others are ignored
  }

  // Apply settlements
  for (const s of settlements) {
    if (s.from_profile === personB && s.to_profile === personA) {
      // B paid A → B's debt decreases
      net -= s.amount
    } else if (s.from_profile === personA && s.to_profile === personB) {
      // A paid B → A's debt decreases → net increases
      net += s.amount
    }
  }

  const abs = Math.abs(net)
  const direction: BalanceResult['direction'] =
    abs < 0.01 ? 'settled' : net > 0 ? 'bOwes' : 'aOwes'

  return { net, direction, amount: abs }
}

/** Total amount spent by a given profile in the supplied expense list */
export function totalSpentBy(profileId: string, expenses: Expense[]): number {
  return expenses
    .filter((e) => e.paid_by === profileId)
    .reduce((sum, e) => sum + e.amount, 0)
}

/** Total household spend across all expenses */
export function totalSpend(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0)
}
