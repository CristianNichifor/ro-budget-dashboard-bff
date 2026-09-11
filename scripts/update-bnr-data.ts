import { parseArgs } from "node:util";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  bnrDataSchema,
  bnrExportSchema,
  type BnrData,
  type BnrExport,
} from "../src/data/bnrDataSchema";

/**
 * Manual BNR update script (P4).
 *
 * --input <export.json>  merges a BNR inflation export (array of
 *                        {year, cpiPercent}) into src/data/bnr-inflation.json,
 *                        preserving the existing avgNetSalary values.
 * --check                validates the current data file (exit 1 on error).
 *
 * The BNR has no stable public API, so exports are prepared manually
 * (quarterly, from the inflation reports) and committed.
 */

const DATA_FILE = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../src/data/bnr-inflation.json"
);

interface SeriesEntry {
  year: number;
  cpiPercent: number;
  avgNetSalary: number;
}

export function mergeInflationSeries(
  existing: SeriesEntry[],
  update: BnrExport
): SeriesEntry[] {
  const byYear = new Map(existing.map((entry) => [entry.year, entry]));

  for (const point of update) {
    const current = byYear.get(point.year);
    byYear.set(point.year, {
      year: point.year,
      cpiPercent: point.cpiPercent,
      avgNetSalary: current?.avgNetSalary ?? 0,
    });
  }

  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

function loadCurrent(): BnrData {
  const parsed = bnrDataSchema.safeParse(
    JSON.parse(readFileSync(DATA_FILE, "utf8"))
  );
  if (!parsed.success) {
    throw new Error(`Invalid data file: ${parsed.error.message}`);
  }
  return parsed.data;
}

function check(): void {
  const data = loadCurrent();
  console.log(
    `OK: ${data.series.length} years, target ${data.inflationTarget}%, updated ${data.updatedAt}`
  );
}

function update(inputPath: string): void {
  const parsed = bnrExportSchema.safeParse(
    JSON.parse(readFileSync(resolve(inputPath), "utf8"))
  );
  if (!parsed.success) {
    throw new Error(`Invalid input export: ${parsed.error.message}`);
  }

  const current = loadCurrent();
  const next: BnrData = {
    ...current,
    updatedAt: new Date().toISOString().slice(0, 10),
    series: mergeInflationSeries(current.series, parsed.data),
  };

  writeFileSync(DATA_FILE, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Written ${DATA_FILE} (${next.series.length} years)`);
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const { values } = parseArgs({
    options: {
      input: { type: "string" },
      check: { type: "boolean" },
    },
  });

  if (values.check === true) {
    check();
  } else if (values.input !== undefined) {
    update(values.input);
  } else {
    console.error(
      "Usage: update-bnr-data.ts [--check | --input <export.json>]"
    );
    process.exit(1);
  }
}
