export interface CountyInvestment {
  county: string;
  region: string;
  amount: string;
}

export interface InvestmentsByCounty {
  year: number;
  total: string;
  counties: CountyInvestment[];
  /** True when the amounts are an estimate, not an official dataset. */
  estimated: boolean;
  note: string;
}
