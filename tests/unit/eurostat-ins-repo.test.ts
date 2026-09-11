import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/infra/config";
import {
  EUROSTAT_INS_METRICS,
  EurostatInsSource,
} from "../../src/modules/ins/shell/eurostat-ins-repo";

describe("EurostatInsSource", () => {
  const source = new EurostatInsSource(loadConfig({}));

  it("exposes the expected social indicators", () => {
    expect(EUROSTAT_INS_METRICS.map((m) => m.code)).toEqual([
      "infant-mortality",
      "life-expectancy",
      "hospital-beds",
      "pensioners",
    ]);
  });

  it("returns the catalog without touching the network", async () => {
    const result = await source.getCatalog();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    expect(result.value).toHaveLength(4);
    expect(result.value[0]).toEqual({
      code: "infant-mortality",
      label: "Mortalitate infantilă",
      unit: "la 1.000 născuți vii",
    });
  });

  it("returns empty data for an unknown code", async () => {
    const result = await source.getMetric("unknown-code");
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    expect(result.value.data).toEqual([]);
  });
});
