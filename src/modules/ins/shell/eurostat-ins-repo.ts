import { err, ok, type Result } from "neverthrow";
import type { AppConfig } from "../../../infra/config";
import type { AppError } from "../../../common/errors";
import { upstreamUnavailable } from "../../../common/errors";
import { parseEurostatJsonStat } from "../../macro/core/parsers";
import type { InsCatalogEntry, InsMetric } from "../core/types";
import type { InsDataSource } from "../core/ports";

/**
 * Live INS-style social indicators served from Eurostat (INS TEMPO has no
 * clean public JSON API, so the equivalent Eurostat datasets are used
 * instead — same definitions, honest source badge). Each metric maps to a
 * single-series JSON-stat dataset with an annual time dimension.
 */

export interface InsMetricDefinition {
  code: string;
  label: string;
  unit: string;
  url: string;
}

export const EUROSTAT_INS_METRICS: InsMetricDefinition[] = [
  {
    code: "infant-mortality",
    label: "Mortalitate infantilă",
    unit: "la 1.000 născuți vii",
    url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_minfind?format=JSON&geo=RO&indic_de=INFMORRT&sinceTimePeriod=2015",
  },
  {
    code: "life-expectancy",
    label: "Speranța de viață la naștere",
    unit: "ani",
    url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_mlexpec?format=JSON&geo=RO&sex=T&age=Y1&sinceTimePeriod=2015",
  },
  {
    code: "hospital-beds",
    label: "Paturi de spital",
    unit: "la 100.000 locuitori",
    url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/hlth_rs_bds?format=JSON&geo=RO&facility=HBEDT&unit=HAB_P&sinceTimePeriod=2015",
  },
  {
    code: "pensioners",
    label: "Beneficiari de pensii",
    unit: "persoane",
    url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/spr_pns_ben?format=JSON&geo=RO&spdepm=TOTAL&spscheme=TOTAL&spdepb=TOTAL&sex=T&unit=PER&sinceTimePeriod=2015",
  },
];

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface CacheEntry {
  value: InsMetric;
  expiresAt: number;
}

export class EurostatInsSource implements InsDataSource {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly config: AppConfig) {}

  getCatalog(): Promise<Result<InsCatalogEntry[], AppError>> {
    return Promise.resolve(
      ok(
        EUROSTAT_INS_METRICS.map(({ code, label, unit }) => ({
          code,
          label,
          unit,
        }))
      )
    );
  }

  async getMetric(code: string): Promise<Result<InsMetric, AppError>> {
    const definition = EUROSTAT_INS_METRICS.find((item) => item.code === code);
    if (definition === undefined) {
      return ok({ code, unit: "", label: code, data: [] });
    }

    const cached = this.cache.get(code);
    if (cached !== undefined && cached.expiresAt > Date.now()) {
      return ok(cached.value);
    }

    try {
      const response = await fetch(definition.url, {
        signal: AbortSignal.timeout(this.config.macroTimeoutMs),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        return err(upstreamUnavailable(`ins source: HTTP ${response.status}`));
      }

      const parsed = parseEurostatJsonStat(await response.json());
      if (parsed.isErr()) {
        return err(parsed.error);
      }

      const metric: InsMetric = {
        code,
        unit: definition.unit,
        label: definition.label,
        data: parsed.value.map((point) => ({
          year: Number(point.time),
          value: point.value,
        })),
      };

      this.cache.set(code, {
        value: metric,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return ok(metric);
    } catch {
      return err(upstreamUnavailable("ins source unreachable"));
    }
  }
}
