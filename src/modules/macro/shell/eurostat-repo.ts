import { err, ok, type Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import { upstreamUnavailable } from "../../../common/errors";
import type { AppConfig } from "../../../infra/config";
import type { MacroDataSource } from "../core/ports";
import {
  buildTradePoints,
  compressRateSteps,
  mergeGdpPerCapita,
  parseEcbFx,
  parseEurostatJsonStat,
  parseEurostatRegions,
  parseEurostatUpdated,
} from "../core/parsers";
import type {
  CurrentAccountSeries,
  DebtSeries,
  DeficitSeries,
  DemographicSeries,
  EmploymentSeries,
  FxSeries,
  GdpGrowthSeries,
  GdpPerCapitaSeries,
  GdpRegionsSeries,
  InflationSeries,
  RatesSeries,
  TradeSeries,
  UnemploymentSeries,
} from "../core/types";

const EUROSTAT_HICP_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_manr?format=JSON&geo=RO&unit=RCH_A&coicop=CP00&sinceTimePeriod=2019-01";

const EUROSTAT_UNEMPLOYMENT_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m?format=JSON&geo=RO&age=TOTAL&unit=PC_ACT&s_adj=SA&sex=T&sinceTimePeriod=2019-01";

const ECB_FX_URL =
  "https://data-api.ecb.europa.eu/service/data/EXR/D.RON.EUR.SP00.A?format=jsondata&startPeriod=2019-01-01";

const EUROSTAT_GDP_GROWTH_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/namq_10_gdp?format=JSON&geo=RO&unit=CLV_PCH_PRE&s_adj=SCA&na_item=B1GQ&sinceTimePeriod=2019-Q1";

const EUROSTAT_GDP_PPS_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sdg_10_10?format=JSON&geo=RO&indic_ppp=EXP_PPS_EU27_2020_HAB&sinceTimePeriod=2019";

const EUROSTAT_GDP_EU27_INDEX_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sdg_10_10?format=JSON&geo=RO&indic_ppp=VI_PPS_EU27_2020_HAB&sinceTimePeriod=2019";

const EUROSTAT_GDP_REGIONS_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_2gdp?format=JSON&unit=EUR_HAB_EU27_2020&lastTimePeriod=1";

const GDP_REGION_LABELS: Record<string, string> = {
  RO11: "Nord-Vest",
  RO12: "Centru",
  RO21: "Nord-Est",
  RO22: "Sud-Est",
  RO31: "Sud-Muntenia",
  RO32: "București-Ilfov",
  RO41: "Sud-Vest Oltenia",
  RO42: "Vest",
};

const EUROSTAT_DEBT_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10dd_edpt1?format=JSON&geo=RO&unit=PC_GDP&sector=S13&na_item=GD&sinceTimePeriod=2019";

const EUROSTAT_EXPORTS_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp?format=JSON&geo=RO&unit=PC_GDP&na_item=P6&sinceTimePeriod=2019";

const EUROSTAT_IMPORTS_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp?format=JSON&geo=RO&unit=PC_GDP&na_item=P7&sinceTimePeriod=2019";

const EUROSTAT_DEMOGRAPHICS_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjanind?format=JSON&geo=RO&indic_de=OLDDEP1&sinceTimePeriod=2019";

const EUROSTAT_DEFICIT_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10q_ggnfa?format=JSON&geo=RO&unit=PC_GDP&s_adj=NSA&sector=S13&na_item=B9&sinceTimePeriod=2020";

const EUROSTAT_EMPLOYMENT_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfsi_emp_q?format=JSON&geo=RO&indic_em=EMP_LFS&unit=PC_POP&s_adj=SA&age=Y20-64&sex=T&sinceTimePeriod=2020";

const EUROSTAT_CURRENT_ACCOUNT_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/bop_c6_q?format=JSON&geo=RO&bop_item=CA&stk_flow=BAL&partner=WRL_REST&currency=MIO_EUR&sector10=S1&sectpart=S1&sinceTimePeriod=2020";

const ECB_DEPOSIT_RATE_URL =
  "https://data-api.ecb.europa.eu/service/data/FM/D.U2.EUR.4F.KR.DFR.LEV?format=jsondata&startPeriod=2020-01";

/** BNR inflation target, unchanged since August 2013. */
const BNR_INFLATION_TARGET = 2.5;

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

  private async getJson(url: string): Promise<Result<JsonEnvelope, AppError>> {
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
      const data = await response.json();
      return ok({ data, updated: parseEurostatUpdated(data) ?? "" });
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
      const parsed = parseEurostatJsonStat(result.value.data);
      if (parsed.isErr()) {
        return err(parsed.error);
      }
      return ok({
        targetPercent: BNR_INFLATION_TARGET,
        monthly: parsed.value.map((point) => ({
          ym: point.time,
          annualRate: point.value,
        })),
        sourceUpdated: result.value.updated,
      });
    });
  }

  async getUnemployment(): Promise<Result<UnemploymentSeries, AppError>> {
    return this.getCached("unemployment", async () => {
      const result = await this.getJson(EUROSTAT_UNEMPLOYMENT_URL);
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = parseEurostatJsonStat(result.value.data);
      if (parsed.isErr()) {
        return err(parsed.error);
      }
      return ok({
        monthly: parsed.value.map((point) => ({
          ym: point.time,
          rate: point.value,
        })),
        sourceUpdated: result.value.updated,
      });
    });
  }

  async getFx(): Promise<Result<FxSeries, AppError>> {
    return this.getCached("fx", async () => {
      const result = await this.getJson(ECB_FX_URL);
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = parseEcbFx(result.value.data);
      if (parsed.isErr()) {
        return err(parsed.error);
      }
      return ok({
        series: parsed.value.map((point) => ({
          date: point.time,
          eurRon: point.value,
        })),
        sourceUpdated: parsed.value.at(-1)?.time ?? "",
      });
    });
  }

  async getGdpGrowth(): Promise<Result<GdpGrowthSeries, AppError>> {
    return this.getCached("gdp-growth", async () => {
      const result = await this.getJson(EUROSTAT_GDP_GROWTH_URL);
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = parseEurostatJsonStat(result.value.data);
      if (parsed.isErr()) {
        return err(parsed.error);
      }
      return ok({
        quarterly: parsed.value.map((point) => ({
          quarter: point.time,
          pctChange: point.value,
        })),
        sourceUpdated: result.value.updated,
      });
    });
  }

  async getGdpPerCapita(): Promise<Result<GdpPerCapitaSeries, AppError>> {
    return this.getCached("gdp-per-capita", async () => {
      const ppsResult = await this.getJson(EUROSTAT_GDP_PPS_URL);
      if (ppsResult.isErr()) {
        return err(ppsResult.error);
      }
      const indexResult = await this.getJson(EUROSTAT_GDP_EU27_INDEX_URL);
      if (indexResult.isErr()) {
        return err(indexResult.error);
      }
      const pps = parseEurostatJsonStat(ppsResult.value.data);
      if (pps.isErr()) {
        return err(pps.error);
      }
      const index = parseEurostatJsonStat(indexResult.value.data);
      if (index.isErr()) {
        return err(index.error);
      }
      const merged = mergeGdpPerCapita(pps.value, index.value);
      if (merged.isErr()) {
        return err(merged.error);
      }
      return ok({
        yearly: merged.value,
        sourceUpdated: latestUpdated(
          ppsResult.value.updated,
          indexResult.value.updated
        ),
      });
    });
  }

  async getDebt(): Promise<Result<DebtSeries, AppError>> {
    return this.getCached("debt", async () => {
      const result = await this.getJson(EUROSTAT_DEBT_URL);
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
          percentGdp: point.value,
        })),
        sourceUpdated: result.value.updated,
      });
    });
  }

  async getTrade(): Promise<Result<TradeSeries, AppError>> {
    return this.getCached("trade", async () => {
      const exportsResult = await this.getJson(EUROSTAT_EXPORTS_URL);
      if (exportsResult.isErr()) {
        return err(exportsResult.error);
      }
      const importsResult = await this.getJson(EUROSTAT_IMPORTS_URL);
      if (importsResult.isErr()) {
        return err(importsResult.error);
      }
      const exports = parseEurostatJsonStat(exportsResult.value.data);
      if (exports.isErr()) {
        return err(exports.error);
      }
      const imports = parseEurostatJsonStat(importsResult.value.data);
      if (imports.isErr()) {
        return err(imports.error);
      }
      const merged = buildTradePoints(exports.value, imports.value);
      if (merged.isErr()) {
        return err(merged.error);
      }
      return ok({
        yearly: merged.value,
        sourceUpdated: latestUpdated(
          exportsResult.value.updated,
          importsResult.value.updated
        ),
      });
    });
  }

  async getDemographics(): Promise<Result<DemographicSeries, AppError>> {
    return this.getCached("demographics", async () => {
      const result = await this.getJson(EUROSTAT_DEMOGRAPHICS_URL);
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
          oldAgeDependency: point.value,
        })),
        sourceUpdated: result.value.updated,
      });
    });
  }

  async getDeficit(): Promise<Result<DeficitSeries, AppError>> {
    return this.getCached("deficit", async () => {
      const result = await this.getJson(EUROSTAT_DEFICIT_URL);
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = parseEurostatJsonStat(result.value.data);
      if (parsed.isErr()) {
        return err(parsed.error);
      }
      return ok({
        quarterly: parsed.value.map((point) => ({
          quarter: point.time,
          percentGdp: point.value,
        })),
        sourceUpdated: result.value.updated,
      });
    });
  }

  async getEmployment(): Promise<Result<EmploymentSeries, AppError>> {
    return this.getCached("employment", async () => {
      const result = await this.getJson(EUROSTAT_EMPLOYMENT_URL);
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = parseEurostatJsonStat(result.value.data);
      if (parsed.isErr()) {
        return err(parsed.error);
      }
      return ok({
        quarterly: parsed.value.map((point) => ({
          quarter: point.time,
          rate: point.value,
        })),
        sourceUpdated: result.value.updated,
      });
    });
  }

  async getCurrentAccount(): Promise<Result<CurrentAccountSeries, AppError>> {
    return this.getCached("current-account", async () => {
      const result = await this.getJson(EUROSTAT_CURRENT_ACCOUNT_URL);
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = parseEurostatJsonStat(result.value.data);
      if (parsed.isErr()) {
        return err(parsed.error);
      }
      return ok({
        quarterly: parsed.value.map((point) => ({
          quarter: point.time,
          balanceMioEur: point.value,
        })),
        sourceUpdated: result.value.updated,
      });
    });
  }

  async getRates(): Promise<Result<RatesSeries, AppError>> {
    return this.getCached("rates", async () => {
      const result = await this.getJson(ECB_DEPOSIT_RATE_URL);
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = parseEcbFx(result.value.data);
      if (parsed.isErr()) {
        return err(parsed.error);
      }
      const ecb = compressRateSteps(parsed.value).map((point) => ({
        date: point.time,
        depositRate: point.value,
      }));
      return ok({
        ecb,
        sourceUpdated: ecb.at(-1)?.date ?? "",
      });
    });
  }

  async getGdpRegions(): Promise<Result<GdpRegionsSeries, AppError>> {
    return this.getCached("gdp-regions", async () => {
      const result = await this.getJson(EUROSTAT_GDP_REGIONS_URL);
      if (result.isErr()) {
        return err(result.error);
      }
      const codes = Object.keys(GDP_REGION_LABELS);
      const parsed = parseEurostatRegions(result.value.data, codes);
      if (parsed.isErr()) {
        return err(parsed.error);
      }

      const timeDimension = (
        result.value.data as {
          dimension?: {
            time?: { category?: { index?: Record<string, number> } };
          };
        }
      ).dimension?.time?.category?.index;
      const year = Object.keys(timeDimension ?? {})[0] ?? "";

      return ok({
        year,
        regions: parsed.value.map((point) => ({
          code: point.code,
          label: GDP_REGION_LABELS[point.code] ?? point.code,
          indexEu27: point.value,
        })),
        sourceUpdated: result.value.updated,
      });
    });
  }
}
