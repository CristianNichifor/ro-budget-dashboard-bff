import { Decimal } from "decimal.js";
import { err, ok, type Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import { upstreamUnavailable } from "../../../common/errors";
import type { AppConfig } from "../../../infra/config";
import {
  parseEurostatJsonStat,
  parseEurostatUpdated,
} from "../../macro/core/parsers";
import type { ContextDataSource, ContextTrend } from "../core/ports";

const HEALTH_SPENDING_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_exp?format=JSON&geo=RO&cofog99=GF07&unit=MIO_EUR&na_item=TE&sector=S13&sinceTimePeriod=2015";

const HEALTH_BUDGET_SOURCE = "Eurostat COFOG (gov_10a_exp, GF07)";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export class EurostatContextSource implements ContextDataSource {
  private readonly timeoutMs: number;
  private cache?: { value: ContextTrend; expiresAt: number };

  constructor(config: AppConfig) {
    this.timeoutMs = config.macroTimeoutMs;
  }

  private async getJson(url: string): Promise<Result<unknown, AppError>> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        return err(
          upstreamUnavailable(`context source: HTTP ${response.status}`)
        );
      }
      return ok(await response.json());
    } catch {
      return err(upstreamUnavailable("context source unreachable"));
    }
  }

  private async getHealthBudget(): Promise<Result<ContextTrend, AppError>> {
    if (this.cache !== undefined && this.cache.expiresAt > Date.now()) {
      return ok(this.cache.value);
    }

    const result = await this.getJson(HEALTH_SPENDING_URL);
    if (result.isErr()) {
      return err(result.error);
    }
    const parsed = parseEurostatJsonStat(result.value);
    if (parsed.isErr()) {
      return err(parsed.error);
    }

    const trend: ContextTrend = {
      metric: "health-budget",
      source: HEALTH_BUDGET_SOURCE,
      sourceUpdated: parseEurostatUpdated(result.value) ?? "",
      data: parsed.value.map((point) => ({
        year: Number(point.time),
        amount: new Decimal(point.value).toDecimalPlaces(1).toString(),
      })),
    };

    this.cache = { value: trend, expiresAt: Date.now() + CACHE_TTL_MS };
    return ok(trend);
  }

  async getTrend(metric: string): Promise<Result<ContextTrend, AppError>> {
    if (metric === "health-budget") {
      return this.getHealthBudget();
    }
    return ok({ metric, source: "unknown", sourceUpdated: "", data: [] });
  }
}

export function buildContextSource(config: AppConfig): ContextDataSource {
  return new EurostatContextSource(config);
}
