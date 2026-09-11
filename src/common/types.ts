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

export interface InflationPoint {
  year: number;
  cpiPercent: number;
  avgNetSalary: number;
}

export interface RealWagePoint {
  year: number;
  nominal: number;
  real: number;
}

export interface MonetaryContext {
  inflation: {
    current: number;
    target: number;
    history: InflationPoint[];
  };
  realWage: RealWagePoint[];
  debt: {
    total: string;
    interestPayment: string;
    averageRate: number;
    debtServiceRatio: string;
  };
}
