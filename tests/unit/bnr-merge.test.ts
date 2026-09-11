import { describe, expect, it } from "vitest";
import { mergeInflationSeries } from "../../scripts/update-bnr-data";

describe("mergeInflationSeries", () => {
  it("updates inflation and preserves avgNetSalary for existing years", () => {
    const merged = mergeInflationSeries(
      [
        { year: 2025, cpiPercent: 7.2, avgNetSalary: 5168 },
        { year: 2026, cpiPercent: 9.69, avgNetSalary: 5539 },
      ],
      [{ year: 2026, cpiPercent: 8.4 }]
    );

    expect(merged).toEqual([
      { year: 2025, cpiPercent: 7.2, avgNetSalary: 5168 },
      { year: 2026, cpiPercent: 8.4, avgNetSalary: 5539 },
    ]);
  });

  it("appends new years with a zero salary placeholder", () => {
    const merged = mergeInflationSeries([], [{ year: 2027, cpiPercent: 4.1 }]);

    expect(merged).toEqual([{ year: 2027, cpiPercent: 4.1, avgNetSalary: 0 }]);
  });

  it("keeps the series sorted by year", () => {
    const merged = mergeInflationSeries(
      [{ year: 2024, cpiPercent: 5.9, avgNetSalary: 5062 }],
      [
        { year: 2026, cpiPercent: 9.69 },
        { year: 2025, cpiPercent: 7.2 },
      ]
    );

    expect(merged.map((entry) => entry.year)).toEqual([2024, 2025, 2026]);
  });
});
