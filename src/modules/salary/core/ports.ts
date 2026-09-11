import type { TaxRates } from "./types";

export interface TaxRatesProvider {
  get(): TaxRates;
}
