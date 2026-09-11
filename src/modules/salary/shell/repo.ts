import { Decimal } from "decimal.js";
import type { TaxRates } from "../core/types";
import type { TaxRatesProvider } from "../core/ports";

/** 2026 rates from the Open Budget model (kept as strings — no floats). */
export const staticTaxRates: TaxRatesProvider = {
  get(): TaxRates {
    return {
      cas: new Decimal("0.25"),
      cass: new Decimal("0.10"),
      incomeTax: new Decimal("0.10"),
      employerContribution: new Decimal("0.0225"),
      vat: new Decimal("0.21"),
      vatConsumptionShare: new Decimal("0.75"),
    };
  },
};
