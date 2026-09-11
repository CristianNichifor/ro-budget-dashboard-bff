import type {
  BudgetDestination,
  BudgetSummary,
  InflationPoint,
  YearAmount,
} from "./types";

/**
 * DEMO seeds, mirroring the frontend's static data. Phase P3/P4 replaces
 * them via the hackforfacts source (or INS/BNR integrations).
 */

export const SEED_BUDGET_SUMMARY: BudgetSummary = {
  year: 2026,
  revenue: "728990724000",
  expenditure: "864675193000",
  deficit: "135684469000",
  deficitPercentGdp: "7.1",
};

export const SEED_BUDGET_DESTINATIONS: BudgetDestination[] = [
  {
    id: "pensii",
    name: "Pensii",
    amount: "217814450000",
    percentOfTotal: "25.2",
    subDestinations: [
      {
        id: "pensii-contributive",
        name: "Pensii contributive",
        amount: "154755000000",
      },
      {
        id: "pensii-speciale",
        name: "Pensii speciale",
        amount: "18710547184",
      },
      {
        id: "pensii-minime",
        name: "Pensii minime",
        amount: "18664373816",
      },
      { id: "pensii-urmas", name: "Pensii de urmaș", amount: "1885000000" },
    ],
  },
  {
    id: "fonduri-externe",
    name: "Proiecte pe fonduri externe",
    amount: "146837970000",
    percentOfTotal: "17.0",
  },
  {
    id: "asistenta-sociala",
    name: "Asistență socială",
    amount: "113504154000",
    percentOfTotal: "13.1",
  },
  {
    id: "salarii",
    name: "Salarii",
    amount: "110091069000",
    percentOfTotal: "12.7",
  },
  {
    id: "datorii",
    name: "Datorii și angajamente",
    amount: "82751313000",
    percentOfTotal: "9.6",
  },
  {
    id: "investitii",
    name: "Investiții",
    amount: "35928663000",
    percentOfTotal: "4.2",
  },
];

export const SEED_HEALTH_BUDGET_TREND: YearAmount[] = [
  { year: 2021, amount: "22000000000" },
  { year: 2022, amount: "24500000000" },
  { year: 2023, amount: "26000000000" },
  { year: 2024, amount: "27100000000" },
  { year: 2025, amount: "26140000000" },
  { year: 2026, amount: "22780000000" },
];

export const SEED_INFLATION_SERIES: InflationPoint[] = [
  { year: 2021, cpiPercent: 5.1, avgNetSalary: 3416 },
  { year: 2022, cpiPercent: 13.8, avgNetSalary: 3907 },
  { year: 2023, cpiPercent: 10.4, avgNetSalary: 4564 },
  { year: 2024, cpiPercent: 5.9, avgNetSalary: 5062 },
  { year: 2025, cpiPercent: 7.2, avgNetSalary: 5168 },
  { year: 2026, cpiPercent: 9.69, avgNetSalary: 5539 },
];

export const SEED_INFLATION_TARGET = 2.5;

export const SEED_DEBT = {
  total: "883000000000",
  interestPayment: "59407395000",
  averageRate: 6.8,
};

export interface InsMetricPointSeed {
  year: number;
  value: number;
}

export interface InsMetricSeed {
  code: string;
  unit: string;
  label: string;
  data: InsMetricPointSeed[];
}

/**
 * INS statistical metrics (demo seeds) used to contextualize budget trends.
 * Values are approximate; P3 wires transparenta-eu-ins-loader.
 */
export const SEED_INS_METRICS: InsMetricSeed[] = [
  {
    code: "infant-mortality",
    unit: "la 1.000 locuitori",
    label: "Mortalitate infantilă",
    data: [
      { year: 2021, value: 6.1 },
      { year: 2022, value: 5.9 },
      { year: 2023, value: 5.7 },
      { year: 2024, value: 5.5 },
      { year: 2025, value: 5.4 },
      { year: 2026, value: 5.2 },
    ],
  },
  {
    code: "pensioners",
    unit: "milioane persoane",
    label: "Număr pensionari",
    data: [
      { year: 2021, value: 4.85 },
      { year: 2022, value: 4.82 },
      { year: 2023, value: 4.79 },
      { year: 2024, value: 4.75 },
      { year: 2025, value: 4.72 },
      { year: 2026, value: 4.7 },
    ],
  },
  {
    code: "average-pension",
    unit: "lei/lună",
    label: "Pensie medie",
    data: [
      { year: 2021, value: 1601 },
      { year: 2022, value: 1680 },
      { year: 2023, value: 1971 },
      { year: 2024, value: 2201 },
      { year: 2025, value: 2350 },
      { year: 2026, value: 2500 },
    ],
  },
  {
    code: "hospital-beds",
    unit: "mii paturi",
    label: "Paturi de spital",
    data: [
      { year: 2021, value: 133.2 },
      { year: 2022, value: 131.4 },
      { year: 2023, value: 129.8 },
      { year: 2024, value: 128.1 },
      { year: 2025, value: 127.2 },
      { year: 2026, value: 126.5 },
    ],
  },
];
