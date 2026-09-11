import { describe, expect, it } from "vitest";
import {
  buildTradePoints,
  compressRateSteps,
  mergeGdpPerCapita,
  parseEcbFx,
  parseEurostatJsonStat,
  parseEurostatRegions,
} from "../../src/modules/macro/core/parsers";

const jsonStatSample = {
  version: "2.0",
  class: "dataset",
  id: ["freq", "unit", "coicop", "geo", "time"],
  size: [1, 1, 1, 1, 3],
  value: { 0: 7.3, 1: 6.2, 2: null },
  dimension: {
    time: {
      label: "Time",
      category: {
        index: { "2024-01": 0, "2024-02": 1, "2024-03": 2 },
        label: {
          "2024-01": "2024-01",
          "2024-02": "2024-02",
          "2024-03": "2024-03",
        },
      },
    },
    geo: { label: "Geo", category: { index: { RO: 0 } } },
  },
};

const ecbFxSample = {
  dataSets: [
    {
      series: {
        "0:0:0:0:0": {
          observations: {
            0: [4.9743, 0, 0, null, null],
            1: [4.9751, 0, 0, null, null],
            2: [4.9754, 0, 0, null, null],
          },
        },
      },
    },
  ],
  structure: {
    dimensions: {
      observation: [
        {
          values: [
            { id: "2024-01-02" },
            { id: "2024-01-03" },
            { id: "2024-01-04" },
          ],
        },
      ],
    },
  },
};

describe("parseEurostatJsonStat", () => {
  it("decodes a one-series time dataset and skips nulls", () => {
    const result = parseEurostatJsonStat(jsonStatSample);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    expect(result.value).toEqual([
      { time: "2024-01", value: 7.3 },
      { time: "2024-02", value: 6.2 },
    ]);
  });

  it("fails on malformed input", () => {
    const result = parseEurostatJsonStat({ nope: true });
    expect(result.isErr()).toBe(true);
  });
});

describe("parseEcbFx", () => {
  it("decodes observations against the time values", () => {
    const result = parseEcbFx(ecbFxSample);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    expect(result.value).toEqual([
      { time: "2024-01-02", value: 4.9743 },
      { time: "2024-01-03", value: 4.9751 },
      { time: "2024-01-04", value: 4.9754 },
    ]);
  });

  it("fails on malformed input", () => {
    const result = parseEcbFx({ dataSets: [] });
    expect(result.isErr()).toBe(true);
  });
});

describe("mergeGdpPerCapita", () => {
  it("merges matching years and drops orphans", () => {
    const result = mergeGdpPerCapita(
      [
        { time: "2024", value: 30800 },
        { time: "2025", value: 32400 },
      ],
      [
        { time: "2024", value: 77 },
        { time: "2026", value: 79 },
      ]
    );

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    expect(result.value).toEqual([{ year: "2024", pps: 30800, eu27Index: 77 }]);
  });

  it("fails when no years overlap", () => {
    const result = mergeGdpPerCapita(
      [{ time: "2024", value: 30800 }],
      [{ time: "2026", value: 79 }]
    );
    expect(result.isErr()).toBe(true);
  });
});

describe("buildTradePoints", () => {
  it("derives the balance as exports minus imports", () => {
    const result = buildTradePoints(
      [{ time: "2025", value: 35.5 }],
      [{ time: "2025", value: 40.7 }]
    );

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    expect(result.value).toEqual([
      {
        year: "2025",
        exportsPctGdp: 35.5,
        importsPctGdp: 40.7,
        balancePctGdp: -5.2,
      },
    ]);
  });

  it("fails when no years overlap", () => {
    const result = buildTradePoints(
      [{ time: "2025", value: 35.5 }],
      [{ time: "2024", value: 40.7 }]
    );
    expect(result.isErr()).toBe(true);
  });
});

describe("parseEurostatRegions", () => {
  const multiGeoSample = {
    id: ["freq", "unit", "geo", "time"],
    size: [1, 1, 3, 1],
    value: { 0: 30800, 1: 32400, 2: 41200 },
    dimension: {
      freq: { label: "Frequency", category: { index: { A: 0 } } },
      unit: { label: "Unit", category: { index: { PPS: 0 } } },
      geo: {
        label: "Geopolitical entity",
        category: { index: { RO11: 0, RO12: 1, RO32: 2 } },
      },
      time: { label: "Time", category: { index: { 2024: 0 } } },
    },
  };

  it("extracts the latest value for each requested region", () => {
    const result = parseEurostatRegions(multiGeoSample, [
      "RO11",
      "RO12",
      "RO32",
    ]);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    expect(result.value).toEqual([
      { code: "RO11", value: 30800 },
      { code: "RO12", value: 32400 },
      { code: "RO32", value: 41200 },
    ]);
  });

  it("skips region codes that are absent from the dataset", () => {
    const result = parseEurostatRegions(multiGeoSample, ["RO11", "RO99"]);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    expect(result.value).toEqual([{ code: "RO11", value: 30800 }]);
  });

  it("fails when geo/time dimensions are missing", () => {
    const result = parseEurostatRegions(
      {
        id: ["freq", "unit", "time"],
        size: [1, 1, 1],
        value: {},
        dimension: {},
      },
      ["RO11"]
    );
    expect(result.isErr()).toBe(true);
  });
});

describe("compressRateSteps", () => {
  it("keeps the first point and every change point", () => {
    const result = compressRateSteps([
      { time: "2020-01-01", value: -0.5 },
      { time: "2020-01-02", value: -0.5 },
      { time: "2020-01-03", value: -0.25 },
      { time: "2020-01-04", value: -0.25 },
      { time: "2020-01-05", value: 0 },
    ]);
    expect(result).toEqual([
      { time: "2020-01-01", value: -0.5 },
      { time: "2020-01-03", value: -0.25 },
      { time: "2020-01-05", value: 0 },
    ]);
  });

  it("returns an empty list for empty input", () => {
    expect(compressRateSteps([])).toEqual([]);
  });
});
