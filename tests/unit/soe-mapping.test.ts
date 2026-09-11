import { describe, expect, it } from "vitest";
import {
  buildByCounty,
  buildCompany,
  buildScatter,
  buildSectorTrend,
  buildSubsidies,
  buildSummary,
  type CompanyUpstream,
  type SoeAggregateUpstream,
} from "../../src/modules/soe/core/mapping";

const aggregate: SoeAggregateUpstream = {
  meta: { latest_year: 2024, last_commit_date: "2026-05-04" },
  trend: [
    {
      an: 2023,
      total: 1100,
      pe_pierdere: 300,
      profitabile: 800,
      mediana_marja: 0.01,
    },
  ],
  scatter: [
    {
      nume: "ACME S.A.",
      cui: "12345",
      marja: -0.5,
      cost_anual: 120000,
      max_salariu: 9000,
      nr_pers: 4,
      levier: 0.2,
      roe: 0.05,
    },
  ],
  top_profit: [
    { nume: "TITAN POWER", cui: "111", marja: 5.1676 },
    { nume: "ALT", cui: "222", marja: 1 },
  ],
  top_pierdere: [{ nume: "SANTIER", cui: "333", marja: -72.7676 }],
  top_angajatori: [
    {
      cui: "444",
      nume: "Romsilva",
      nr_salariati: 13625,
      cifra_afaceri: 2986336165,
    },
  ],
  emblematice: [
    {
      nume: "CFR",
      cui: "555",
      marja: -0.3572,
      label: "CFR SA",
      status_anexa1: "PIERDERE",
      max_salariu: 50322,
      subventie_2025_mii_lei: 3096900,
      subventie_2025_sursa: "HG",
    },
  ],
  stats: {
    total_companii_stat: 1502,
    total_in_date: 1161,
    centrale: 147,
    locale: 1182,
    cifra_afaceri_totala_mld: 94.5,
    profit_total_mld: 15.8,
    pierderi_total_mld: 2.0,
    companii_pe_pierdere_2024: 298,
  },
  judete_2024: [
    {
      cod: 1,
      nume: "Alba",
      nr: 13,
      mediana: 0.0589,
      pierdere: 3,
      pct: 23.1,
      pierderi_lei: 13983217,
      profit_lei: 78862896,
      ca_lei: 842520886,
    },
  ],
  pay_scale_rows: [
    { kind: "ref", label: "Salariu minim brut", value: 4050, unit: "lei/lună" },
  ],
};

describe("buildSummary", () => {
  it("maps stats, tops and emblematice with money as strings", () => {
    const summary = buildSummary(aggregate);

    expect(summary.stats).toMatchObject({
      year: 2024,
      updatedAt: "2026-05-04",
      totalCompanies: 1502,
      revenue: "94.5",
      profit: "15.8",
      losses: "2",
      companiesOnLoss: 298,
    });
    expect(summary.topProfit[0]).toEqual({
      cui: "111",
      name: "TITAN POWER",
      marginPercent: 516.8,
    });
    expect(summary.topLoss[0]?.marginPercent).toBe(-7276.8);
    expect(summary.topEmployers[0]).toMatchObject({
      name: "Romsilva",
      employees: 13625,
      revenue: "2986336165",
    });
    expect(summary.emblematice[0]).toMatchObject({
      label: "CFR SA",
      status: "PIERDERE",
      marginPercent: -35.7,
      maxSalary: "50322",
      subsidy2025MiiLei: "3096900",
    });
  });
});

describe("buildScatter", () => {
  it("converts margin ratios to percent and money to strings", () => {
    const scatter = buildScatter(aggregate.scatter, 2024);

    expect(scatter.year).toBe(2024);
    expect(scatter.points[0]).toMatchObject({
      cui: "12345",
      marginPercent: -50,
      annualCost: "120000",
      maxSalary: "9000",
      employees: 4,
    });
  });
});

describe("buildByCounty", () => {
  it("maps county rows", () => {
    const byCounty = buildByCounty(aggregate.judete_2024, 2024);

    expect(byCounty.counties[0]).toMatchObject({
      code: 1,
      name: "Alba",
      companies: 13,
      onLoss: 3,
      lossPercent: 23.1,
      revenue: "842520886",
      profit: "78862896",
      losses: "13983217",
    });
  });
});

describe("buildSectorTrend", () => {
  it("maps sector series", () => {
    const trend = buildSectorTrend(
      [
        {
          key: "apa-canal",
          label: "Apă-canal",
          series: [
            { an: 2024, total: 394, pe_pierdere: 118, pct_pierdere: 29.9 },
          ],
        },
      ],
      "note"
    );

    expect(trend.sectors[0]).toMatchObject({
      key: "apa-canal",
      label: "Apă-canal",
    });
    expect(trend.sectors[0]?.series[0]).toMatchObject({
      year: 2024,
      total: 394,
      onLoss: 118,
      lossPercent: 29.9,
    });
  });
});

describe("buildCompany", () => {
  it("maps a company sheet with nulls handled", () => {
    const upstream: CompanyUpstream = {
      cui: "12345",
      nume: "ACME S.A.",
      judet_nume: "Alba",
      sector_key: "energie",
      sector_label: "Energie",
      caen: "3511",
      ticker: null,
      listat_bvb: false,
      tier: 1,
      fin_history: [
        { an: 2023, marja: 0.01, roe: 0.02, levier: 0.1, status: "PROFIT" },
      ],
      fin_2024: {
        an: 2024,
        marja: null,
        roe: null,
        levier: null,
        status: "OPAC",
      },
      salarii: { max_salariu: 9000, cost_anual: 120000, nr_pers: 4 },
      mfin_2024: {
        cifra_afaceri: 1000000,
        profit_net: 50000,
        pierdere_neta: 0,
        nr_salariati: 10,
        capitaluri: 200000,
      },
      subventie_2025_mii_lei: null,
      subventie_2025_sursa: null,
      derived_status: "PROFIT",
      derived_status_2025: null,
    };

    const company = buildCompany(upstream);

    expect(company).toMatchObject({
      cui: "12345",
      name: "ACME S.A.",
      county: "Alba",
      sectorLabel: "Energie",
      tier: 1,
      status: "PROFIT",
      salaries: { maxSalary: "9000", annualCost: "120000", people: 4 },
      mfin: {
        ca: "1000000",
        profit: "50000",
        loss: "0",
        employees: 10,
        capitaluri: "200000",
      },
      subsidy2025MiiLei: null,
    });
    expect(company.financials[0]).toEqual({
      year: 2023,
      margin: 1,
      roe: 0.02,
      levier: 0.1,
      status: "PROFIT",
    });
  });
});

describe("buildSubsidies", () => {
  it("maps year data and sorts operators by subsidy", () => {
    const subsidies = buildSubsidies(
      2024,
      {
        n_uats: 59,
        total_lei: 4749294947.43,
        uats: [],
        judete: [
          {
            name: "Municipiul București",
            tr: 1500042409.65,
            te: 1086157390,
            total: 2586199799.65,
            n_uats: 1,
          },
        ],
      },
      [
        {
          cui: "1",
          name: "B",
          uat_name: "X",
          sector: "transport",
          subv: 100,
          ca: 200,
          profit: 10,
          pierdere: 0,
        },
        {
          cui: "2",
          name: "A",
          uat_name: "Y",
          sector: "termo",
          subv: 500,
          ca: 600,
          profit: 0,
          pierdere: 5,
        },
      ]
    );

    expect(subsidies).toMatchObject({
      year: 2024,
      total: "4749294947.43",
      uats: 59,
    });
    expect(subsidies.operators[0]).toMatchObject({ cui: "2", subsidy: "500" });
    expect(subsidies.counties[0]).toMatchObject({
      name: "Municipiul București",
      total: "2586199799.65",
    });
  });
});
