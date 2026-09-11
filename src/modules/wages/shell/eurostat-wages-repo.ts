import { err, ok, type Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import { upstreamUnavailable } from "../../../common/errors";
import type { AppConfig } from "../../../infra/config";
import {
  parseEurostatJsonStat,
  parseEurostatUpdated,
} from "../../macro/core/parsers";
import { deflateWageSeries } from "../core/use-cases/deflate-wage";
import { synthesizeMonthlyWage } from "../core/use-cases/synthesize-monthly";
import type { WageDataSource } from "../core/ports";
import type {
  HicpIndexPoint,
  LciPoint,
  MonthlyWageSeries,
  RealWageSeries,
  SesAnchor,
  WageContext,
} from "../core/types";

const LCI_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lc_lci_r2_q?format=JSON&geo=RO&nace_r2=B-S&lcstruct=D1_D4_MD5&unit=PCH_SM&s_adj=CA&sinceTimePeriod=2020";

const SES_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/earn_ses_annual?format=JSON&geo=RO&indic_se=MEAN_E_EUR&nace_r2=B-S_X_O&isco08=TOTAL&worktime=TOTAL&age=TOTAL&sex=T";

const HICP_MIDX_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_midx?format=JSON&geo=RO&coicop=CP00&unit=I15&sinceTimePeriod=2020-01";

const WAGE_NOTE =
  "INS nu publică salariul mediu lunar ca serie JSON curată; folosim indicele trimestrial al costului muncii (Eurostat) ca tendință și câștigul mediu anual brut din Ancheta structurală a câștigurilor (Eurostat, o dată la 4 ani).";

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

export class EurostatWageSource implements WageDataSource {
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
          upstreamUnavailable(`wages source: HTTP ${response.status}`)
        );
      }
      const data = await response.json();
      return ok({ data, updated: parseEurostatUpdated(data) ?? "" });
    } catch {
      return err(upstreamUnavailable("wages source unreachable"));
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

  async getContext(): Promise<Result<WageContext, AppError>> {
    const lci = await this.getLci();
    if (lci.isErr()) {
      return err(lci.error);
    }

    const ses = await this.getSes();
    if (ses.isErr()) {
      return err(ses.error);
    }

    return ok({
      lciQuarterly: lci.value.points,
      sesAnchors: ses.value.points,
      note: WAGE_NOTE,
      sourceUpdated: latestUpdated(lci.value.updated, ses.value.updated),
    });
  }

  private getLci(): Promise<
    Result<{ points: LciPoint[]; updated: string }, AppError>
  > {
    return this.getCached("wages-lci", async () => {
      const result = await this.getJson(LCI_URL);
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
          pctChange: point.value,
        })),
        updated: result.value.updated,
      });
    });
  }

  private getSes(): Promise<
    Result<{ points: SesAnchor[]; updated: string }, AppError>
  > {
    return this.getCached("wages-ses", async () => {
      const result = await this.getJson(SES_URL);
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
          meanGrossEur: point.value,
        })),
        updated: result.value.updated,
      });
    });
  }

  async getMonthly(): Promise<Result<MonthlyWageSeries, AppError>> {
    const lci = await this.getLci();
    if (lci.isErr()) {
      return err(lci.error);
    }
    const ses = await this.getSes();
    if (ses.isErr()) {
      return err(ses.error);
    }
    const synthesized = synthesizeMonthlyWage(
      lci.value.points,
      ses.value.points
    );
    if (synthesized.isErr()) {
      return err(synthesized.error);
    }
    return ok({
      ...synthesized.value,
      sourceUpdated: latestUpdated(lci.value.updated, ses.value.updated),
    });
  }

  private getHicpIndex(): Promise<
    Result<{ points: HicpIndexPoint[]; updated: string }, AppError>
  > {
    return this.getCached("wages-hicp", async () => {
      const result = await this.getJson(HICP_MIDX_URL);
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
          index: point.value,
        })),
        updated: result.value.updated,
      });
    });
  }

  async getReal(): Promise<Result<RealWageSeries, AppError>> {
    const monthly = await this.getMonthly();
    if (monthly.isErr()) {
      return err(monthly.error);
    }
    const hicp = await this.getHicpIndex();
    if (hicp.isErr()) {
      return err(hicp.error);
    }
    const deflated = deflateWageSeries(
      monthly.value.monthly,
      hicp.value.points
    );
    if (deflated.isErr()) {
      return err(deflated.error);
    }
    return ok({
      ...deflated.value,
      sourceUpdated: latestUpdated(
        monthly.value.sourceUpdated,
        hicp.value.updated
      ),
    });
  }
}
