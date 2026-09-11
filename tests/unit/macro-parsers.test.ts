import { describe, expect, it } from "vitest";
import {
  parseEcbFx,
  parseEurostatJsonStat,
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
