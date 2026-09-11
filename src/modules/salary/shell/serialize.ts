import type { Decimal } from "decimal.js";
import type { SalaryBreakdown } from "../core/types";

const MONEY_DECIMALS = 2;
const PERCENT_DECIMALS = 4;

function toLei(value: Decimal): string {
  return value.toDecimalPlaces(MONEY_DECIMALS).toFixed(MONEY_DECIMALS);
}

export function serializeSalaryBreakdown(breakdown: SalaryBreakdown) {
  return {
    gross: toLei(breakdown.gross),
    cas: toLei(breakdown.cas),
    cass: toLei(breakdown.cass),
    incomeTax: toLei(breakdown.incomeTax),
    employerContribution: toLei(breakdown.employerContribution),
    estimatedVat: toLei(breakdown.estimatedVat),
    net: toLei(breakdown.net),
    employerCost: toLei(breakdown.employerCost),
    stateShare: toLei(breakdown.stateShare),
    statePercent: breakdown.statePercent
      .toDecimalPlaces(PERCENT_DECIMALS)
      .toFixed(PERCENT_DECIMALS),
    entries: breakdown.entries.map((entry) => ({
      labelKey: entry.labelKey,
      amount: toLei(entry.amount),
    })),
  };
}
