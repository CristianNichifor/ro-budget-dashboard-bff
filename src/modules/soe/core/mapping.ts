import type {
  SoeByCounty,
  SoeCompany,
  SoeListed,
  SoeListedCompany,
  SoeScatter,
  SoeSectorTrend,
  SoeSubsidies,
  SoeSummary,
} from "./types";

// Upstream shapes (companiidestat.ro /date/v1/*.json) — structural,
// transport-independent so the mapping stays pure and testable.

export interface SoeAggregateUpstream {
  meta: { latest_year: number; last_commit_date: string };
  trend: {
    an: number;
    total: number;
    pe_pierdere: number;
    profitabile: number;
    mediana_marja: number | null;
  }[];
  scatter: {
    nume: string;
    cui: string;
    marja: number;
    cost_anual: number | null;
    max_salariu: number | null;
    nr_pers: number;
    levier: number;
    roe: number;
  }[];
  top_profit: { nume: string; cui: string; marja: number }[];
  top_pierdere: { nume: string; cui: string; marja: number }[];
  top_angajatori: {
    cui: string;
    nume: string;
    nr_salariati: number;
    cifra_afaceri: number;
  }[];
  emblematice: {
    nume: string;
    cui: string;
    marja: number;
    label: string;
    status_anexa1: string | null;
    max_salariu: number | null;
    subventie_2025_mii_lei: number | null;
    subventie_2025_sursa: string | null;
  }[];
  stats: {
    total_companii_stat: number;
    total_in_date: number;
    centrale: number;
    locale: number;
    cifra_afaceri_totala_mld: number;
    profit_total_mld: number;
    pierderi_total_mld: number;
    companii_pe_pierdere_2024: number;
  };
  judete_2024: {
    cod: number;
    nume: string;
    nr: number;
    mediana: number;
    pierdere: number;
    pct: number;
    pierderi_lei: number;
    profit_lei: number;
    ca_lei: number;
  }[];
  pay_scale_rows: {
    kind: string;
    label: string;
    value: number;
    unit: string;
  }[];
}

export interface SectorUpstream {
  key: string;
  label: string;
  series: {
    an: number;
    total: number;
    pe_pierdere: number;
    pct_pierdere: number;
  }[];
}

export interface CompanyUpstream {
  cui: string;
  nume: string;
  judet_nume?: string | null;
  sector_key?: string | null;
  sector_label?: string | null;
  caen?: string | null;
  ticker?: string | null;
  listat_bvb?: boolean;
  tier?: number | null;
  fin_history?:
    | {
        an: number;
        marja: number | null;
        roe: number | null;
        levier: number | null;
        status: string;
      }[]
    | null;
  fin_2024?: {
    an: number;
    marja: number | null;
    roe: number | null;
    levier: number | null;
    status: string;
  } | null;
  salarii?: {
    max_salariu: number | null;
    cost_anual: number | null;
    nr_pers: number;
  } | null;
  mfin_2024?: {
    cifra_afaceri: number | null;
    profit_net: number | null;
    pierdere_neta: number | null;
    nr_salariati: number | null;
    capitaluri: number | null;
  } | null;
  subventie_2025_mii_lei?: number | null;
  subventie_2025_sursa?: string | null;
  derived_status?: string | null;
  derived_status_2025?: string | null;
}

export interface SubsidiesUpstream {
  n_uats: number;
  total_lei: number;
  uats: { cui: string; name: string; county: string; total: number }[];
  judete: {
    name: string;
    tr: number;
    te: number;
    total: number;
    n_uats: number;
  }[];
}

export interface SubsidyOperatorUpstream {
  cui: string;
  name: string;
  uat_name: string | null;
  sector: string;
  subv: number;
  ca: number;
  profit: number;
  pierdere: number;
}

export interface ListedUpstream {
  ticker: string;
  name: string;
  listed: number;
  stat_pct: number;
  ministry: string;
  yearly_profit: { an: number; profit_mld_lei: number }[];
  monthly_price: { ym: string; price_lei: number }[];
}

function ratioPercent(ratio: number | null | undefined): number | null {
  if (ratio === null || ratio === undefined) {
    return null;
  }
  return Number((ratio * 100).toFixed(1));
}

function leiOrNull(value: number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

export function buildSummary(upstream: SoeAggregateUpstream): SoeSummary {
  const stats = upstream.stats;
  const toLei1 = (value: number) => Number(value.toFixed(1)).toString();

  return {
    stats: {
      year: upstream.meta.latest_year,
      updatedAt: upstream.meta.last_commit_date,
      totalCompanies: stats.total_companii_stat,
      companiesWithData: stats.total_in_date,
      central: stats.centrale,
      local: stats.locale,
      revenue: toLei1(stats.cifra_afaceri_totala_mld),
      profit: toLei1(stats.profit_total_mld),
      losses: toLei1(stats.pierderi_total_mld),
      companiesOnLoss: stats.companii_pe_pierdere_2024,
    },
    payScale: upstream.pay_scale_rows.map((row) => ({ ...row })),
    topProfit: upstream.top_profit.slice(0, 5).map((entry) => ({
      cui: entry.cui,
      name: entry.nume,
      marginPercent: ratioPercent(entry.marja) ?? 0,
    })),
    topLoss: upstream.top_pierdere.slice(0, 5).map((entry) => ({
      cui: entry.cui,
      name: entry.nume,
      marginPercent: ratioPercent(entry.marja) ?? 0,
    })),
    topEmployers: upstream.top_angajatori.slice(0, 5).map((entry) => ({
      cui: entry.cui,
      name: entry.nume,
      employees: entry.nr_salariati,
      revenue: String(entry.cifra_afaceri),
    })),
    emblematice: upstream.emblematice.map((entry) => ({
      cui: entry.cui,
      name: entry.nume,
      label: entry.label,
      status: entry.status_anexa1 ?? "—",
      marginPercent: ratioPercent(entry.marja) ?? 0,
      maxSalary: leiOrNull(entry.max_salariu) ?? "0",
      subsidy2025MiiLei: leiOrNull(entry.subventie_2025_mii_lei),
    })),
  };
}

export function buildSectorTrend(
  sectors: SectorUpstream[],
  sourceNote: string
): SoeSectorTrend {
  return {
    sectors: sectors.map((sector) => ({
      key: sector.key,
      label: sector.label,
      series: sector.series.map((point) => ({
        year: point.an,
        total: point.total,
        onLoss: point.pe_pierdere,
        lossPercent: Number(point.pct_pierdere.toFixed(1)),
      })),
    })),
    sourceNote,
  };
}

export function buildByCounty(
  judete: SoeAggregateUpstream["judete_2024"],
  year: number
): SoeByCounty {
  return {
    year,
    counties: judete.map((county) => ({
      code: county.cod,
      name: county.nume,
      companies: county.nr,
      onLoss: county.pierdere,
      lossPercent: Number(county.pct.toFixed(1)),
      medianMargin: Number(county.mediana.toFixed(4)),
      revenue: String(county.ca_lei),
      profit: String(county.profit_lei),
      losses: String(county.pierderi_lei),
    })),
  };
}

export function buildScatter(
  points: SoeAggregateUpstream["scatter"],
  year: number
): SoeScatter {
  return {
    year,
    points: points.map((point) => ({
      cui: point.cui,
      name: point.nume,
      marginPercent: ratioPercent(point.marja) ?? 0,
      annualCost: leiOrNull(point.cost_anual) ?? "0",
      maxSalary: leiOrNull(point.max_salariu) ?? "0",
      employees: point.nr_pers,
      levier: point.levier,
      roe: point.roe,
    })),
  };
}

export function buildCompany(upstream: CompanyUpstream): SoeCompany {
  const financials = (upstream.fin_history ?? []).map((point) => ({
    year: point.an,
    margin: ratioPercent(point.marja),
    roe: point.roe === null ? null : Number(point.roe.toFixed(2)),
    levier: point.levier === null ? null : Number(point.levier.toFixed(4)),
    status: point.status,
  }));

  return {
    cui: upstream.cui,
    name: upstream.nume,
    county: upstream.judet_nume ?? "",
    sectorKey: upstream.sector_key ?? "",
    sectorLabel: upstream.sector_label ?? "",
    caen: upstream.caen ?? "",
    ticker: upstream.ticker ?? null,
    listed: upstream.listat_bvb ?? false,
    tier: upstream.tier ?? 0,
    status: upstream.derived_status ?? "—",
    status2025: upstream.derived_status_2025 ?? null,
    financials,
    salaries: {
      maxSalary: leiOrNull(upstream.salarii?.max_salariu) ?? "0",
      annualCost: leiOrNull(upstream.salarii?.cost_anual) ?? "0",
      people: upstream.salarii?.nr_pers ?? 0,
    },
    mfin: {
      ca: leiOrNull(upstream.mfin_2024?.cifra_afaceri) ?? "0",
      profit: leiOrNull(upstream.mfin_2024?.profit_net) ?? "0",
      loss: leiOrNull(upstream.mfin_2024?.pierdere_neta) ?? "0",
      employees: upstream.mfin_2024?.nr_salariati ?? 0,
      capitaluri: leiOrNull(upstream.mfin_2024?.capitaluri) ?? "0",
    },
    subsidy2025MiiLei: leiOrNull(upstream.subventie_2025_mii_lei ?? null),
    subsidy2025Source: upstream.subventie_2025_sursa ?? null,
  };
}

export function buildSubsidies(
  year: number,
  upstream: SubsidiesUpstream,
  operators: SubsidyOperatorUpstream[]
): SoeSubsidies {
  return {
    year,
    total: String(upstream.total_lei),
    uats: upstream.n_uats,
    counties: upstream.judete.map((county) => ({
      name: county.name,
      total: String(county.total),
      tr: String(county.tr),
      te: String(county.te),
      uats: county.n_uats,
    })),
    operators: operators
      .map((operator) => ({
        cui: operator.cui,
        name: operator.name,
        uat: operator.uat_name ?? "",
        sector: operator.sector,
        subsidy: String(operator.subv),
        revenue: String(operator.ca),
        profit: String(operator.profit),
        loss: String(operator.pierdere),
      }))
      .sort((a, b) => Number(b.subsidy) - Number(a.subsidy)),
  };
}

export function buildListed(upstream: ListedUpstream[]): SoeListed {
  const companies: SoeListedCompany[] = upstream.map((company) => ({
    ticker: company.ticker,
    name: company.name,
    listedYear: company.listed,
    statePercent: company.stat_pct,
    ministry: company.ministry,
    yearlyProfit: company.yearly_profit.map((point) => ({
      year: point.an,
      profitMldLei: point.profit_mld_lei,
    })),
    monthlyPrice: company.monthly_price.map((point) => ({
      ym: point.ym,
      priceLei: point.price_lei,
    })),
  }));

  return { companies };
}
