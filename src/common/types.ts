/**
 * Shared API types. Monetary amounts are STRINGS across the boundary —
 * the no-floats rule: all math happens in decimal.js, in the core.
 */

export interface BudgetSummary {
  year: number;
  revenue: string;
  expenditure: string;
  deficit: string;
  deficitPercentGdp: string;
}

export interface BudgetSubDestination {
  id: string;
  name: string;
  amount: string;
}

export interface BudgetDestination extends BudgetSubDestination {
  percentOfTotal: string;
  subDestinations?: BudgetSubDestination[];
}

export interface YearAmount {
  year: number;
  amount: string;
}
