import type { Decimal } from "decimal.js";

export interface TaxRates {
  cas: Decimal;
  cass: Decimal;
  incomeTax: Decimal;
  employerContribution: Decimal;
  vat: Decimal;
  vatConsumptionShare: Decimal;
}

export interface SalaryBreakdownEntry {
  /** i18n message id, resolved by the frontend. */
  labelKey: string;
  /** Signed amount in lei: positive = income, negative = deduction. */
  amount: Decimal;
}

export interface SalaryBreakdown {
  gross: Decimal;
  cas: Decimal;
  cass: Decimal;
  incomeTax: Decimal;
  employerContribution: Decimal;
  estimatedVat: Decimal;
  net: Decimal;
  employerCost: Decimal;
  stateShare: Decimal;
  statePercent: Decimal;
  entries: SalaryBreakdownEntry[];
}
