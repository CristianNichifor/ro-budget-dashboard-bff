import { err, ok, type Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import { upstreamUnavailable } from "../../../common/errors";
import type { AppConfig } from "../../../infra/config";
import {
  parseEurostatJsonStat,
  parseEurostatUpdated,
} from "../../macro/core/parsers";
import type { EnergyDataSource } from "../core/ports";
import type { EnergyContext } from "../core/types";

const ELECTRICITY_PRICE_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_204?format=JSON&geo=RO&unit=KWH&tax=I_TAX&currency=EUR&nrg_cons=KWH2500-4999&sinceTimePeriod=2019";

const RENEWABLES_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_ind_ren?format=JSON&geo=RO&nrg_bal=REN&sinceTimePeriod=2015";

const IMPORT_DEPENDENCY_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_ind_id?format=JSON&geo=RO&siec=TOTAL&sinceTimePeriod=2015";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class EurostatEnergySource implements EnergyDataSource {
  private readonly timeoutMs: number;
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(config: AppConfig) {
    this.timeoutMs = config.macroTimeoutMs;
  }

  private async getJson(
    url: string
  ): Promise<Result<{ data: unknown; updated: string }, AppError>> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        return err(
          upstreamUnavailable(`energy source: HTTP ${response.status}`)
        );
      }
      const data = await response.json();
      return ok({ data, updated: parseEurostatUpdated(data) ?? "" });
    } catch {
      return err(upstreamUnavailable("energy source unreachable"));
    }
  }

  private async getCached<T>(
    key: string,
    loader: () => Promise<Result<T, AppError>>
  ): Promise<Result<T, AppError>> {
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;
    if (cached !== undefined && cached.expiresAt > Date.now()) {
      return ok(cached.value);
    }
    const result = await loader();
    if (result.isOk()) {
      this.cache.set(key, {
        value: result.value,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }
    return result;
  }

  private async getYearlyPctSeries(
    cacheKey: string,
    url: string
  ): Promise<
    Result<
      { points: { year: string; pct: number }[]; updated: string },
      AppError
    >
  > {
    return this.getCached(cacheKey, async () => {
      const result = await this.getJson(url);
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = parseEurostatJsonStat(result.value.data);
      if (parsed.isErr()) {
        return err(parsed.error);
      }
      return ok({
        points: parsed.value.map((point) => ({
          year: point.time,
          pct: point.value,
        })),
        updated: result.value.updated,
      });
    });
  }

  async getContext(): Promise<Result<EnergyContext, AppError>> {
    const electricity = await this.getCached("energy-electricity", async () => {
      const result = await this.getJson(ELECTRICITY_PRICE_URL);
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = parseEurostatJsonStat(result.value.data);
      if (parsed.isErr()) {
        return err(parsed.error);
      }
      return ok({
        points: parsed.value.map((point) => ({
          period: point.time,
          eurPerKwh: point.value,
        })),
        updated: result.value.updated,
      });
    });
    if (electricity.isErr()) {
      return err(electricity.error);
    }

    const renewables = await this.getYearlyPctSeries(
      "energy-renewables",
      RENEWABLES_URL
    );
    if (renewables.isErr()) {
      return err(renewables.error);
    }

    const importDependency = await this.getYearlyPctSeries(
      "energy-import-dependency",
      IMPORT_DEPENDENCY_URL
    );
    if (importDependency.isErr()) {
      return err(importDependency.error);
    }

    return ok({
      electricity: electricity.value.points,
      renewables: renewables.value.points,
      importDependency: importDependency.value.points,
      sourceUpdated:
        [
          electricity.value.updated,
          renewables.value.updated,
          importDependency.value.updated,
        ]
          .filter((date) => date.length > 0)
          .sort()
          .at(-1) ?? "",
    });
  }
}
