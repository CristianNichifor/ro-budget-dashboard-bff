import { err, ok, type Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import { upstreamUnavailable } from "../../../common/errors";
import type { AppConfig } from "../../../infra/config";
import type { MacroDataSource } from "../core/ports";
import { parseEcbFx, parseEurostatJsonStat } from "../core/parsers";
import type {
  FxSeries,
  InflationSeries,
  UnemploymentSeries,
} from "../core/types";

const EUROSTAT_HICP_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_manr?format=JSON&geo=RO&unit=RCH_A&coicop=CP00&sinceTimePeriod=2019-01";

const EUROSTAT_UNEMPLOYMENT_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m?format=JSON&geo=RO&age=TOTAL&unit=PC_ACT&s_adj=SA&sex=T&sinceTimePeriod=2019-01";

const ECB_FX_URL =
  "https://data-api.ecb.europa.eu/service/data/EXR/D.RON.EUR.SP00.A?format=jsondata&startPeriod=2019-01-01";

/** BNR inflation target, unchanged since August 2013. */
const BNR_INFLATION_TARGET = 2.5;

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Live macro data: Eurostat (HICP inflation, ILO unemployment) and ECB
 * (EUR/RON). Both endpoints are public JSON APIs; responses are cached for
 * a few hours — inflation is monthly, unemployment monthly, FX daily.
 */
export class EurostatMacroSource implements MacroDataSource {
  private readonly timeoutMs: number;
  private readonly cache = new Map<string, CacheEntry<unknown>>();

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
          upstreamUnavailable(`macro source: HTTP ${response.status}`)
        );
      }
      return ok(await response.json());
    } catch {
      return err(upstreamUnavailable("macro source unreachable"));
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

  async getInflation(): Promise<Result<InflationSeries, AppError>> {
    return this.getCached("inflation", async () => {
      const result = await this.getJson(EUROSTAT_HICP_URL);
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = parseEurostatJsonStat(result.value);
      if (parsed.isErr()) {
        return err(parsed.error);
      }
      return ok({
        targetPercent: BNR_INFLATION_TARGET,
        monthly: parsed.value.map((point) => ({
          ym: point.time,
          annualRate: point.value,
        })),
      });
    });
  }

  async getUnemployment(): Promise<Result<UnemploymentSeries, AppError>> {
    return this.getCached("unemployment", async () => {
      const result = await this.getJson(EUROSTAT_UNEMPLOYMENT_URL);
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = parseEurostatJsonStat(result.value);
      if (parsed.isErr()) {
        return err(parsed.error);
      }
      return ok({
        monthly: parsed.value.map((point) => ({
          ym: point.time,
          rate: point.value,
        })),
      });
    });
  }

  async getFx(): Promise<Result<FxSeries, AppError>> {
    return this.getCached("fx", async () => {
      const result = await this.getJson(ECB_FX_URL);
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = parseEcbFx(result.value);
      if (parsed.isErr()) {
        return err(parsed.error);
      }
      return ok({
        series: parsed.value.map((point) => ({
          date: point.time,
          eurRon: point.value,
        })),
      });
    });
  }
}
