export interface SoeStats {
  year: number;
  /** ISO date of the upstream data snapshot. */
  updatedAt: string;
  totalCompanies: number;
  companiesWithData: number;
  central: number;
  local: number;
  /** Lei, string — no floats rule applies to money. */
  revenue: string;
  profit: string;
  losses: string;
  companiesOnLoss: number;
}

export interface SoeTopEntry {
  cui: string;
  name: string;
  /** Net margin as percent. */
  marginPercent: number;
}

export interface SoeTopEmployer {
  cui: string;
  name: string;
  employees: number;
  revenue: string;
}

export interface SoeEmblematic {
  cui: string;
  name: string;
  label: string;
  status: string;
  marginPercent: number;
  maxSalary: string;
  subsidy2025MiiLei: string | null;
}

export interface SoePayScaleRow {
  kind: string;
  label: string;
  value: number;
  unit: string;
}

export interface SoeSummary {
  stats: SoeStats;
  payScale: SoePayScaleRow[];
  topProfit: SoeTopEntry[];
  topLoss: SoeTopEntry[];
  topEmployers: SoeTopEmployer[];
  emblematice: SoeEmblematic[];
}

export interface SoeSectorSeriesPoint {
  year: number;
  total: number;
  onLoss: number;
  lossPercent: number;
}

export interface SoeSector {
  key: string;
  label: string;
  series: SoeSectorSeriesPoint[];
}

export interface SoeSectorTrend {
  sectors: SoeSector[];
  sourceNote: string;
}

export interface SoeCounty {
  code: number;
  name: string;
  companies: number;
  onLoss: number;
  lossPercent: number;
  medianMargin: number;
  revenue: string;
  profit: string;
  losses: string;
}

export interface SoeByCounty {
  year: number;
  counties: SoeCounty[];
}

export interface SoeScatterPoint {
  cui: string;
  name: string;
  /** Net margin as percent. */
  marginPercent: number;
  annualCost: string;
  maxSalary: string;
  employees: number;
  levier: number;
  roe: number;
}

export interface SoeScatter {
  year: number;
  points: SoeScatterPoint[];
}

export interface SoeCompanyFinancials {
  year: number;
  margin: number | null;
  roe: number | null;
  levier: number | null;
  status: string;
}

export interface SoeCompany {
  cui: string;
  name: string;
  county: string;
  sectorKey: string;
  sectorLabel: string;
  caen: string;
  ticker: string | null;
  listed: boolean;
  tier: number;
  status: string;
  status2025: string | null;
  financials: SoeCompanyFinancials[];
  salaries: { maxSalary: string; annualCost: string; people: number };
  mfin: {
    ca: string;
    profit: string;
    loss: string;
    employees: number;
    capitaluri: string;
  };
  subsidy2025MiiLei: string | null;
  subsidy2025Source: string | null;
}

export interface SoeSubsidyOperator {
  cui: string;
  name: string;
  uat: string;
  sector: string;
  subsidy: string;
  revenue: string;
  profit: string;
  loss: string;
}

export interface SoeSubsidyCounty {
  name: string;
  total: string;
  tr: string;
  te: string;
  uats: number;
}

export interface SoeSubsidies {
  year: number;
  total: string;
  uats: number;
  counties: SoeSubsidyCounty[];
  operators: SoeSubsidyOperator[];
}

export interface SoeListedCompany {
  ticker: string;
  name: string;
  listedYear: number;
  statePercent: number;
  ministry: string;
  yearlyProfit: { year: number; profitMldLei: number }[];
  monthlyPrice: { ym: string; priceLei: number }[];
}

export interface SoeListed {
  companies: SoeListedCompany[];
}
