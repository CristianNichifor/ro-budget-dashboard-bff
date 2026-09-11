import { err, ok, type Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import { upstreamUnavailable } from "../../../common/errors";
import type { AppConfig } from "../../../infra/config";
import {
  parseEurostatJsonStat,
  parseEurostatUpdated,
} from "../../macro/core/parsers";
import type { SocietyDataSource } from "../core/ports";
import type {
  DemographicsSeries,
  EducationSeries,
  HealthSeries,
  PopulationSeries,
  SocietySpending,
} from "../core/types";

const POPULATION_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjan?format=JSON&geo=RO&age=TOTAL&sex=T&sinceTimePeriod=2015";

const HEALTH_SPENDING_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_exp?format=JSON&geo=RO&cofog99=GF07&unit=PC_GDP&na_item=TE&sector=S13&sinceTimePeriod=2015";

const EDUCATION_SPENDING_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_exp?format=JSON&geo=RO&cofog99=GF09&unit=PC_GDP&na_item=TE&sector=S13&sinceTimePeriod=2015";

const EARLY_LEAVERS_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/edat_lfse_14?format=JSON&geo=RO&sex=T&age=Y18-24&wstatus=POP&sinceTimePeriod=2015";

const TERTIARY_ATTAINMENT_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/edat_lfse_03?format=JSON&geo=RO&sex=T&age=Y25-34&isced11=ED5-8&sinceTimePeriod=2015";

const PHYSICIANS_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/hlth_rs_phys?format=JSON&geo=RO&unit=NR&age=TOTAL&sex=T&sinceTimePeriod=2015";

const MEDIAN_AGE_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjanind?format=JSON&geo=RO&indic_de=MEDAGEPOP&sinceTimePeriod=2015";

const NET_MIGRATION_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_gind?format=JSON&geo=RO&indic_de=CNMIGRATRT&sinceTimePeriod=2015";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface JsonEnvelope {
  data: unknown;
  updated: string;
}

function latestUpdated(...dates: string[]): string {
  return (
    dates
      .filter((date) => date.length > 0)
      .sort()
      .at(-1) ?? ""
  );
}

export class EurostatSocietySource implements SocietyDataSource {
  private readonly timeoutMs: number;
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(config: AppConfig) {
    this.timeoutMs = config.macroTimeoutMs;
  }

  private async getJson(url: string): Promise<Result<JsonEnvelope, AppError>> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        return err(
          upstreamUnavailable(`society source: HTTP ${response.status}`)
        );
      }
      const data = await response.json();
      return ok({ data, updated: parseEurostatUpdated(data) ?? "" });
    } catch {
      return err(upstreamUnavailable("society source unreachable"));
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

  private async getSpendingSeries(
    cacheKey: string,
    url: string
  ): Promise<
    Result<
      { points: { year: string; percentGdp: number }[]; updated: string },
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
          percentGdp: point.value,
        })),
        updated: result.value.updated,
      });
    });
  }

  async getPopulation(): Promise<Result<PopulationSeries, AppError>> {
    return this.getCached("society-population", async () => {
      const result = await this.getJson(POPULATION_URL);
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = parseEurostatJsonStat(result.value.data);
      if (parsed.isErr()) {
        return err(parsed.error);
      }
      return ok({
        yearly: parsed.value.map((point) => ({
          year: point.time,
          population: point.value,
        })),
        sourceUpdated: result.value.updated,
      });
    });
  }

  async getSpending(): Promise<Result<SocietySpending, AppError>> {
    const health = await this.getSpendingSeries(
      "society-spending-health",
      HEALTH_SPENDING_URL
    );
    if (health.isErr()) {
      return err(health.error);
    }
    const education = await this.getSpendingSeries(
      "society-spending-education",
      EDUCATION_SPENDING_URL
    );
    if (education.isErr()) {
      return err(education.error);
    }
    return ok({
      health: health.value.points,
      education: education.value.points,
      sourceUpdated: latestUpdated(
        health.value.updated,
        education.value.updated
      ),
    });
  }

  private async getPctSeries(
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

  async getEducation(): Promise<Result<EducationSeries, AppError>> {
    const earlyLeavers = await this.getPctSeries(
      "society-education-early-leavers",
      EARLY_LEAVERS_URL
    );
    if (earlyLeavers.isErr()) {
      return err(earlyLeavers.error);
    }
    const tertiaryAttainment = await this.getPctSeries(
      "society-education-tertiary",
      TERTIARY_ATTAINMENT_URL
    );
    if (tertiaryAttainment.isErr()) {
      return err(tertiaryAttainment.error);
    }
    return ok({
      earlyLeavers: earlyLeavers.value.points,
      tertiaryAttainment: tertiaryAttainment.value.points,
      sourceUpdated: latestUpdated(
        earlyLeavers.value.updated,
        tertiaryAttainment.value.updated
      ),
    });
  }

  async getHealth(): Promise<Result<HealthSeries, AppError>> {
    return this.getCached("society-health-physicians", async () => {
      const result = await this.getJson(PHYSICIANS_URL);
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = parseEurostatJsonStat(result.value.data);
      if (parsed.isErr()) {
        return err(parsed.error);
      }
      return ok({
        physicians: parsed.value.map((point) => ({
          year: point.time,
          count: point.value,
        })),
        sourceUpdated: result.value.updated,
      });
    });
  }

  async getDemographics(): Promise<Result<DemographicsSeries, AppError>> {
    const medianAge = await this.getCached(
      "society-demo-median-age",
      async () => {
        const result = await this.getJson(MEDIAN_AGE_URL);
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
            age: point.value,
          })),
          updated: result.value.updated,
        });
      }
    );
    if (medianAge.isErr()) {
      return err(medianAge.error);
    }

    const netMigration = await this.getCached(
      "society-demo-net-migration",
      async () => {
        const result = await this.getJson(NET_MIGRATION_URL);
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
            per1000: point.value,
          })),
          updated: result.value.updated,
        });
      }
    );
    if (netMigration.isErr()) {
      return err(netMigration.error);
    }

    return ok({
      medianAge: medianAge.value.points,
      netMigration: netMigration.value.points,
      sourceUpdated: latestUpdated(
        medianAge.value.updated,
        netMigration.value.updated
      ),
    });
  }
}
