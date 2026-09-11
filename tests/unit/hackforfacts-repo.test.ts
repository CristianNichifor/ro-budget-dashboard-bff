import { afterEach, describe, expect, it, vi } from "vitest";
import { HackForFactsSource } from "../../src/modules/budget/shell/hackforfacts-repo";
import { loadConfig } from "../../src/infra/config";

const config = loadConfig({
  NODE_ENV: "test",
  HACK_FOR_FACTS_BASE_URL: "http://hff.test",
  HACK_FOR_FACTS_YEAR: "2024",
});

function mockFetch(payload: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => payload,
    }))
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HackForFactsSource", () => {
  it("sends the principal-ordonator report type to avoid double counting", async () => {
    mockFetch({
      data: {
        executionAnalytics: [
          { seriesId: "revenue", data: [{ x: "2024", y: 600 }] },
          { seriesId: "expenditure", data: [{ x: "2024", y: 700 }] },
          { seriesId: "revenue_pct_gdp", data: [{ x: "2024", y: 30.1 }] },
          { seriesId: "expenditure_pct_gdp", data: [{ x: "2024", y: 35.4 }] },
        ],
      },
    });

    await new HackForFactsSource(config).getSummary();

    const fetchMock = vi.mocked(fetch);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      variables: {
        inputs: Array<{ filter: { report_type?: string } }>;
      };
    };
    for (const input of body.variables.inputs) {
      expect(input.filter.report_type).toBe("PRINCIPAL_AGGREGATED");
    }
  });

  it("maps executionAnalytics series into a budget summary", async () => {
    mockFetch({
      data: {
        executionAnalytics: [
          { seriesId: "revenue", data: [{ x: "2024", y: 600 }] },
          { seriesId: "expenditure", data: [{ x: "2024", y: 700 }] },
          { seriesId: "revenue_pct_gdp", data: [{ x: "2024", y: 30.1 }] },
          { seriesId: "expenditure_pct_gdp", data: [{ x: "2024", y: 35.4 }] },
        ],
      },
    });

    const result = await new HackForFactsSource(config).getSummary();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        year: 2024,
        revenue: "600",
        expenditure: "700",
        deficit: "100",
        deficitPercentGdp: "5.3",
      });
    }
  });

  it("surfaces GraphQL errors as UPSTREAM_UNAVAILABLE", async () => {
    mockFetch({ errors: [{ message: "boom" }] });

    const result = await new HackForFactsSource(config).getSummary();

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("UPSTREAM_UNAVAILABLE");
      expect(result.error.message).toContain("boom");
    }
  });

  it("maps aggregatedLineItems into destinations", async () => {
    mockFetch({
      data: {
        aggregatedLineItems: {
          nodes: [
            {
              functional_code: "66",
              functional_name: "Sănătate",
              economic_code: "10",
              economic_name: "Salarii",
              amount: 100,
              count: 1,
            },
          ],
        },
      },
    });

    const result = await new HackForFactsSource(config).getDestinations();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.id).toBe("66");
      expect(result.value[0]?.percentOfTotal).toBe("100");
    }
  });

  it("maps entityAnalytics into institutions for a category", async () => {
    mockFetch({
      data: {
        entityAnalytics: {
          nodes: [
            { entity_cui: "1", entity_name: "Spital A", amount: 30 },
            { entity_cui: "2", entity_name: "Spital B", amount: 70 },
          ],
        },
      },
    });

    const result = await new HackForFactsSource(config).getInstitutions("66");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.category).toBe("66");
      expect(result.value.total).toBe("100");
      expect(result.value.institutions[0]?.id).toBe("2");
    }
  });
});
