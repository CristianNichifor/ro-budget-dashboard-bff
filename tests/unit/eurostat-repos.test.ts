import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../../src/infra/config";
import { EurostatSocietySource } from "../../src/modules/society/shell/society-repo";
import { EurostatEnergySource } from "../../src/modules/energy/shell/eurostat-energy-repo";
import { EurostatLabourSource } from "../../src/modules/labour/shell/eurostat-labour-repo";
import { EurostatJusticeSource } from "../../src/modules/justice/shell/eurostat-justice-repo";

const jsonStat = {
  version: "2.0",
  class: "dataset",
  id: ["freq", "unit", "geo", "time"],
  size: [1, 1, 1, 2],
  value: { 0: 2.9, 1: 3.0 },
  updated: "2026-08-14T09:00:00+0200",
  dimension: {
    time: {
      label: "Time",
      category: {
        index: { "2023": 0, "2024": 1 },
        label: { "2023": "2023", "2024": "2024" },
      },
    },
    geo: { label: "Geo", category: { index: { RO: 0 } } },
  },
};

function stubFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => jsonStat }))
  );
}

describe("EurostatSocietySource", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses a single-fetch metric and threads sourceUpdated", async () => {
    stubFetch();
    const source = new EurostatSocietySource(loadConfig({}));
    const result = await source.getHealth();

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    expect(result.value.physicians).toEqual([
      { year: "2023", count: 2.9 },
      { year: "2024", count: 3.0 },
    ]);
    expect(result.value.sourceUpdated).toBe("2026-08-14");
  });
});

describe("EurostatEnergySource", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("aggregates three series and derives the latest updated date", async () => {
    stubFetch();
    const source = new EurostatEnergySource(loadConfig({}));
    const result = await source.getContext();

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    expect(result.value.electricity).toHaveLength(2);
    expect(result.value.renewables).toHaveLength(2);
    expect(result.value.importDependency).toHaveLength(2);
    expect(result.value.sourceUpdated).toBe("2026-08-14");
  });
});

describe("EurostatLabourSource", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("aggregates NEET, youth unemployment and vacancies", async () => {
    stubFetch();
    const source = new EurostatLabourSource(loadConfig({}));
    const result = await source.getContext();

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    expect(result.value.neet).toHaveLength(2);
    expect(result.value.youthUnemployment).toHaveLength(2);
    expect(result.value.vacancies).toHaveLength(2);
    expect(result.value.sourceUpdated).toBe("2026-08-14");
  });
});

describe("EurostatJusticeSource", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("aggregates homicides, prison population and police headcount", async () => {
    stubFetch();
    const source = new EurostatJusticeSource(loadConfig({}));
    const result = await source.getContext();

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    expect(result.value.homicides).toHaveLength(2);
    expect(result.value.prison).toHaveLength(2);
    expect(result.value.police).toHaveLength(2);
    expect(result.value.sourceUpdated).toBe("2026-08-14");
  });
});
