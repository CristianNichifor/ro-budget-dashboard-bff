import { err, ok, type Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import { upstreamUnavailable } from "../../../common/errors";
import type { AppConfig } from "../../../infra/config";
import {
  parseEurostatJsonStat,
  parseEurostatUpdated,
} from "../../macro/core/parsers";
import type { JusticeDataSource } from "../core/ports";
import type { JusticeContext } from "../core/types";

const HOMICIDES_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/crim_off_cat?format=JSON&geo=RO&iccs=ICCS0101&unit=NR&sinceTimePeriod=2010";

const PRISON_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/crim_pris_cap?format=JSON&geo=RO&indic_cr=PRIS_ACT_CAP&unit=NR&sinceTimePeriod=2010";

const POLICE_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/crim_just_job?format=JSON&geo=RO&isco08=OC5412&sex=T&unit=NR&sinceTimePeriod=2010";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class EurostatJusticeSource implements JusticeDataSource {
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
          upstreamUnavailable(`justice source: HTTP ${response.status}`)
        );
      }
      const data = await response.json();
      return ok({ data, updated: parseEurostatUpdated(data) ?? "" });
    } catch {
      return err(upstreamUnavailable("justice source unreachable"));
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

  async getContext(): Promise<Result<JusticeContext, AppError>> {
    const homicides = await this.getCached("justice-homicides", async () => {
      const result = await this.getJson(HOMICIDES_URL);
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
          count: point.value,
        })),
        updated: result.value.updated,
      });
    });
    if (homicides.isErr()) {
      return err(homicides.error);
    }

    const prison = await this.getCached("justice-prison", async () => {
      const result = await this.getJson(PRISON_URL);
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
          prisoners: point.value,
        })),
        updated: result.value.updated,
      });
    });
    if (prison.isErr()) {
      return err(prison.error);
    }

    const police = await this.getCached("justice-police", async () => {
      const result = await this.getJson(POLICE_URL);
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
          officers: point.value,
        })),
        updated: result.value.updated,
      });
    });
    if (police.isErr()) {
      return err(police.error);
    }

    return ok({
      homicides: homicides.value.points,
      prison: prison.value.points,
      police: police.value.points,
      sourceUpdated:
        [homicides.value.updated, prison.value.updated, police.value.updated]
          .filter((date) => date.length > 0)
          .sort()
          .at(-1) ?? "",
    });
  }
}
