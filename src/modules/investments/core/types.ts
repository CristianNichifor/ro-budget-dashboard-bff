export interface CountyInvestment {
  county: string;
  region: string;
  amount: string;
}

export interface InvestmentsByCounty {
  year: number;
  total: string;
  counties: CountyInvestment[];
}
