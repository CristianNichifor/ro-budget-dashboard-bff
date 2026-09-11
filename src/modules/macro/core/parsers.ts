import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { AppError } from "../../../common/errors";
import { upstreamUnavailable } from "../../../common/errors";
import type { GdpPerCapitaPoint, TradePoint } from "./types";

/**
 * Parsers for the two upstream formats:
 * - Eurostat JSON-stat 2.0 (one time dimension, one series)
 * - ECB SDMX-JSON (FX series: single series key, observations indexed by time)
 */

const JsonStatSchema = z.object({
  id: z.array(z.string()),
  size: z.array(z.number().int()),
  value: z.record(z.string(), z.number().nullable()),
  dimension: z.record(
    z.string(),
    z.object({
      label: z.string(),
      category: z.object({
        index: z.record(z.string(), z.number().int()),
      }),
    })
  ),
});

const EcbFxSchema = z.object({
  dataSets: z.tuple([
    z.object({
      series: z.record(
        z.string(),
        z.object({
          observations: z.record(
            z.string(),
            z.tuple([z.number(), z.number(), z.number(), z.null(), z.null()])
          ),
        })
      ),
    }),
  ]),
  structure: z.object({
    dimensions: z.object({
      observation: z.tuple([
        z.object({
          values: z.array(z.object({ id: z.string() })),
        }),
      ]),
    }),
  }),
});

export interface ParsedTimeSeriesPoint {
  time: string;
  value: number;
}

/**
 * Decodes a Eurostat JSON-stat dataset with exactly one varying dimension
 * (time) into an ordered series. Missing values (null) are skipped.
 */
export function parseEurostatJsonStat(
  input: unknown
): Result<ParsedTimeSeriesPoint[], AppError> {
  const parsed = JsonStatSchema.safeParse(input);
  if (!parsed.success) {
    return err(upstreamUnavailable("unexpected Eurostat JSON-stat shape"));
  }

  const { id, size, value, dimension } = parsed.data;
  const timeDimensionName = id[id.length - 1];
  if (timeDimensionName !== "time") {
    return err(
      upstreamUnavailable("Eurostat dataset without a time dimension")
    );
  }

  const timeDim = dimension[timeDimensionName];
  if (timeDim === undefined) {
    return err(upstreamUnavailable("Eurostat time dimension metadata missing"));
  }

  const indexToLabel = new Map<number, string>(
    Object.entries(timeDim.category.index).map(([label, index]) => [
      index,
      label,
    ])
  );

  const points: ParsedTimeSeriesPoint[] = [];
  for (const [key, rawValue] of Object.entries(value)) {
    const linear = Number(key);
    if (!Number.isInteger(linear)) {
      continue;
    }

    // Decode the linear index (mixed-radix, last dimension fastest).
    const position = linear;
    const timeIndex = position % (size[size.length - 1] ?? 1);

    const label = indexToLabel.get(timeIndex);
    if (label === undefined || rawValue === null) {
      continue;
    }
    points.push({ time: label, value: rawValue });
  }

  points.sort((a, b) => a.time.localeCompare(b.time));
  return ok(points);
}

/**
 * Merges the two annual sdg_10_10 series (PPS per capita and the EU27
 * volume index) into one point per year. Years present in only one series
 * are dropped.
 */
export function mergeGdpPerCapita(
  pps: ParsedTimeSeriesPoint[],
  eu27Index: ParsedTimeSeriesPoint[]
): Result<GdpPerCapitaPoint[], AppError> {
  const indexByYear = new Map(
    eu27Index.map((point) => [point.time, point.value])
  );

  const merged: GdpPerCapitaPoint[] = [];
  for (const point of pps) {
    const index = indexByYear.get(point.time);
    if (index === undefined) {
      continue;
    }
    merged.push({ year: point.time, pps: point.value, eu27Index: index });
  }

  if (merged.length === 0) {
    return err(upstreamUnavailable("no matching GDP per capita years"));
  }
  return ok(merged);
}

/**
 * Merges exports and imports (percent of GDP) into yearly trade points and
 * derives the balance, rounded to one decimal.
 */
export function buildTradePoints(
  exports: ParsedTimeSeriesPoint[],
  imports: ParsedTimeSeriesPoint[]
): Result<TradePoint[], AppError> {
  const importsByYear = new Map(
    imports.map((point) => [point.time, point.value])
  );

  const merged: TradePoint[] = [];
  for (const point of exports) {
    const importsValue = importsByYear.get(point.time);
    if (importsValue === undefined) {
      continue;
    }
    merged.push({
      year: point.time,
      exportsPctGdp: point.value,
      importsPctGdp: importsValue,
      balancePctGdp: Math.round((point.value - importsValue) * 10) / 10,
    });
  }

  if (merged.length === 0) {
    return err(upstreamUnavailable("no matching trade years"));
  }
  return ok(merged);
}

/**
 * Decodes the ECB SDMX-JSON EUR/RON daily series.
 */
export function parseEcbFx(
  input: unknown
): Result<ParsedTimeSeriesPoint[], AppError> {
  const parsed = EcbFxSchema.safeParse(input);
  if (!parsed.success) {
    return err(upstreamUnavailable("unexpected ECB FX shape"));
  }

  const series = Object.values(parsed.data.dataSets[0].series);
  const first = series[0];
  if (first === undefined) {
    return err(upstreamUnavailable("ECB FX returned no series"));
  }

  const dates = parsed.data.structure.dimensions.observation[0].values;

  const points: ParsedTimeSeriesPoint[] = [];
  for (const [indexKey, observation] of Object.entries(first.observations)) {
    const index = Number(indexKey);
    const date = dates[index]?.id;
    const value = observation[0];
    if (date === undefined) {
      continue;
    }
    points.push({ time: date, value });
  }

  points.sort((a, b) => a.time.localeCompare(b.time));
  return ok(points);
}
