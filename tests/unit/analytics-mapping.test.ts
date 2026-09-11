import { describe, expect, it } from "vitest";
import {
  buildDestinations,
  buildInstitutions,
  buildSummary,
  latestSeriesValue,
  type AggregatedLineItemNode,
  type AnalyticsSeries,
  type EntityAnalyticsNode,
} from "../../src/modules/budget/core/analytics-mapping";

const series: AnalyticsSeries[] = [
  {
    seriesId: "revenue",
    data: [{ x: "2024", y: 600000000000 }],
  },
  {
    seriesId: "expenditure",
    data: [{ x: "2024", y: 700000000000 }],
  },
  {
    seriesId: "revenue_pct_gdp",
    data: [{ x: "2024", y: 30.1 }],
  },
  {
    seriesId: "expenditure_pct_gdp",
    data: [{ x: "2024", y: 35.4 }],
  },
];

describe("latestSeriesValue", () => {
  it("returns the value of the most recent period", () => {
    expect(
      latestSeriesValue([
        { x: "2023", y: 10 },
        { x: "2025", y: 30 },
        { x: "2024", y: 20 },
      ])
    ).toBe("30");
  });

  it("returns undefined for an empty series", () => {
    expect(latestSeriesValue([])).toBeUndefined();
  });
});

describe("buildSummary", () => {
  it("computes the deficit and the deficit share of GDP", () => {
    const result = buildSummary(series, 2024);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        year: 2024,
        revenue: "600000000000",
        expenditure: "700000000000",
        deficit: "100000000000",
        deficitPercentGdp: "5.3",
      });
    }
  });

  it("errors when revenue or expenditure is missing", () => {
    const result = buildSummary(
      [{ seriesId: "revenue", data: [{ x: "2024", y: 1 }] }],
      2024
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("UPSTREAM_UNAVAILABLE");
    }
  });

  it("falls back to 0% GDP when the normalized series are absent", () => {
    const result = buildSummary(series.slice(0, 2), 2024);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.deficitPercentGdp).toBe("0");
    }
  });
});

const lineItems: AggregatedLineItemNode[] = [
  {
    functional_code: "65",
    functional_name: "Învățământ",
    economic_code: "10",
    economic_name: "Salarii",
    amount: 60,
    count: 3,
  },
  {
    functional_code: "65",
    functional_name: "Învățământ",
    economic_code: "20",
    economic_name: "Bunuri",
    amount: 40,
    count: 2,
  },
  {
    functional_code: "66",
    functional_name: "Sănătate",
    economic_code: "10",
    economic_name: "Salarii",
    amount: 300,
    count: 1,
  },
];

describe("buildDestinations", () => {
  it("groups line items by functional code and sorts by amount", () => {
    const destinations = buildDestinations(lineItems);

    expect(destinations.map((entry) => entry.id)).toEqual(["66", "65"]);
    expect(destinations[0]).toMatchObject({
      id: "66",
      name: "Sănătate",
      amount: "300",
      percentOfTotal: "75",
    });
    expect(destinations[1]).toMatchObject({
      id: "65",
      amount: "100",
      percentOfTotal: "25",
    });
    expect(destinations[1]?.subDestinations).toHaveLength(2);
    expect(destinations[1]?.subDestinations?.[0]).toEqual({
      id: "65:10",
      name: "Salarii",
      amount: "60",
    });
  });

  it("returns an empty list for no line items", () => {
    expect(buildDestinations([])).toEqual([]);
  });

  it("folds groups beyond the top 8 into a rest destination", () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      functional_code: `f${index}`,
      functional_name: `Funcție ${index}`,
      economic_code: "10",
      economic_name: "Salarii",
      amount: 1000 - index,
      count: 1,
    }));

    const destinations = buildDestinations(many);

    expect(destinations).toHaveLength(9);
    expect(destinations.slice(0, 8).map((entry) => entry.id)).toEqual(
      Array.from({ length: 8 }, (_, index) => `f${index}`)
    );
    expect(destinations[8]).toMatchObject({
      id: "rest",
      name: "Alte destinații",
      amount: "3962",
      percentOfTotal: "33.2",
    });
    expect(destinations[8]?.subDestinations).toHaveLength(4);
    expect(destinations[8]?.subDestinations?.[0]).toEqual({
      id: "f8",
      name: "Funcție 8",
      amount: "992",
    });
  });
});

const entities: EntityAnalyticsNode[] = [
  { entity_cui: "1", entity_name: "Spital A", amount: 30 },
  { entity_cui: "2", entity_name: "Spital B", amount: 70 },
];

describe("buildInstitutions", () => {
  it("sums the total and sorts institutions descending", () => {
    const result = buildInstitutions("66", entities);

    expect(result.total).toBe("100");
    expect(result.institutions.map((entry) => entry.id)).toEqual(["2", "1"]);
    expect(result.institutions[0]?.amount).toBe("70");
  });
});
