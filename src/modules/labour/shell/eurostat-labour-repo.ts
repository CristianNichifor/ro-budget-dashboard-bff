import { err, ok, type Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import { upstreamUnavailable } from "../../../common/errors";
import type { AppConfig } from "../../../infra/config";
import {
  parseEurostatJsonStat,
  parseEurostatUpdated,
} from "../../macro/core/parsers";
import type { LabourDataSource } from "../core/ports";
import type { LabourContext } from "../core/types";

const NEET_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/edat_lfse_20?format=JSON&geo=RO&sex=T&age=Y15-29&training=NO_FE_NO_NFE&wstatus=NEMP&unit=PC&sinceTimePeriod=2015";

const YOUTH_UNEMPLOYMENT_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m?format=JSON&geo=RO&age=Y_LT25&unit=PC_ACT&s_adj=SA&sex=T&sinceTimePeriod=2015";

const VACANCIES_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/jvs_q_nace2?format=JSON&geo=RO&nace_r2=B-S&sizeclas=TOTAL&indic_em=JVR&s_adj=SA&sinceTimePeriod=2015-Q1";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class EurostatLabourSource implements LabourDataSource {
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
          upstreamUnavailable(`labour source: HTTP ${response.status}`)
        );
      }
      const data = await response.json();
      return ok({ data, updated: parseEurostatUpdated(data) ?? "" });
    } catch {
      return err(upstreamUnavailable("labour source unreachable"));
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

  async getContext(): Promise<Result<LabourContext, AppError>> {
    const neet = await this.getCached("labour-neet", async () => {
      const result = await this.getJson(NEET_URL);
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
    if (neet.isErr()) {
      return err(neet.error);
    }

    const youth = await this.getCached(
      "labour-youth-unemployment",
      async () => {
        const result = await this.getJson(YOUTH_UNEMPLOYMENT_URL);
        if (result.isErr()) {
          return err(result.error);
        }
        const parsed = parseEurostatJsonStat(result.value.data);
        if (parsed.isErr()) {
          return err(parsed.error);
        }
        return ok({
          points: parsed.value.map((point) => ({
            ym: point.time,
            rate: point.value,
          })),
          updated: result.value.updated,
        });
      }
    );
    if (youth.isErr()) {
      return err(youth.error);
    }

    const vacancies = await this.getCached("labour-vacancies", async () => {
      const result = await this.getJson(VACANCIES_URL);
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = parseEurostatJsonStat(result.value.data);
      if (parsed.isErr()) {
        return err(parsed.error);
      }
      return ok({
        points: parsed.value.map((point) => ({
          quarter: point.time,
          pct: point.value,
        })),
        updated: result.value.updated,
      });
    });
    if (vacancies.isErr()) {
      return err(vacancies.error);
    }

    return ok({
      neet: neet.value.points,
      youthUnemployment: youth.value.points,
      vacancies: vacancies.value.points,
      sourceUpdated:
        [neet.value.updated, youth.value.updated, vacancies.value.updated]
          .filter((date) => date.length > 0)
          .sort()
          .at(-1) ?? "",
    });
  }
}
