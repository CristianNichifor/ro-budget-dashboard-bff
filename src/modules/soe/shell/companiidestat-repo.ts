import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { AppError } from "../../../common/errors";
import { notFound, upstreamUnavailable } from "../../../common/errors";
import type { AppConfig } from "../../../infra/config";
import type { SoeDataSource } from "../core/ports";
import {
  buildByCounty,
  buildCompany,
  buildListed,
  buildScatter,
  buildSectorTrend,
  buildSubsidies,
  buildSummary,
  type CompanyUpstream,
  type ListedUpstream,
  type SectorUpstream,
  type SoeAggregateUpstream,
  type SubsidiesUpstream,
  type SubsidyOperatorUpstream,
} from "../core/mapping";
import type {
  SoeByCounty,
  SoeCompany,
  SoeListed,
  SoeScatter,
  SoeSectorTrend,
  SoeSubsidies,
  SoeSummary,
} from "../core/types";

const AggregateSchema = z.object({
  meta: z.object({
    latest_year: z.number(),
    last_commit_date: z.string(),
  }),
  trend: z.array(
    z.object({
      an: z.number(),
      total: z.number(),
      pe_pierdere: z.number(),
      profitabile: z.number(),
      mediana_marja: z.number().nullable(),
    })
  ),
  scatter: z.array(
    z.object({
      nume: z.string(),
      cui: z.string(),
      marja: z.number(),
      cost_anual: z.number().nullable(),
      max_salariu: z.number().nullable(),
      nr_pers: z.number(),
      levier: z.number(),
      roe: z.number(),
    })
  ),
  top_profit: z.array(
    z.object({ nume: z.string(), cui: z.string(), marja: z.number() })
  ),
  top_pierdere: z.array(
    z.object({ nume: z.string(), cui: z.string(), marja: z.number() })
  ),
  top_angajatori: z.array(
    z.object({
      cui: z.string(),
      nume: z.string(),
      nr_salariati: z.number(),
      cifra_afaceri: z.number(),
    })
  ),
  emblematice: z.array(
    z.object({
      nume: z.string(),
      cui: z.string(),
      marja: z.number(),
      label: z.string(),
      status_anexa1: z.string().nullable(),
      max_salariu: z.number().nullable(),
      subventie_2025_mii_lei: z.number().nullable(),
      subventie_2025_sursa: z.string().nullable(),
    })
  ),
  stats: z.object({
    total_companii_stat: z.number(),
    total_in_date: z.number(),
    centrale: z.number(),
    locale: z.number(),
    cifra_afaceri_totala_mld: z.number(),
    profit_total_mld: z.number(),
    pierderi_total_mld: z.number(),
    companii_pe_pierdere_2024: z.number(),
  }),
  judete_2024: z.array(
    z.object({
      cod: z.number(),
      nume: z.string(),
      nr: z.number(),
      mediana: z.number(),
      pierdere: z.number(),
      pct: z.number(),
      pierderi_lei: z.number(),
      profit_lei: z.number(),
      ca_lei: z.number(),
    })
  ),
  pay_scale_rows: z.array(
    z.object({
      kind: z.string(),
      label: z.string(),
      value: z.number(),
      unit: z.string(),
    })
  ),
});

const SectorTrendSchema = z.object({
  sector_trend: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      series: z.array(
        z.object({
          an: z.number(),
          total: z.number(),
          pe_pierdere: z.number(),
          pct_pierdere: z.number(),
        })
      ),
    })
  ),
  source: z.string().optional(),
  note: z.string().optional(),
});

const CompanySchema = z.object({
  cui: z.string(),
  nume: z.string(),
  judet_nume: z.string().nullable().optional(),
  sector_key: z.string().nullable().optional(),
  sector_label: z.string().nullable().optional(),
  caen: z.string().nullable().optional(),
  ticker: z.string().nullable().optional(),
  listat_bvb: z.boolean().optional(),
  tier: z.number().nullable().optional(),
  fin_history: z
    .array(
      z.object({
        an: z.number(),
        marja: z.number().nullable(),
        roe: z.number().nullable(),
        levier: z.number().nullable(),
        status: z.string(),
      })
    )
    .nullable()
    .optional(),
  fin_2024: z
    .object({
      an: z.number(),
      marja: z.number().nullable(),
      roe: z.number().nullable(),
      levier: z.number().nullable(),
      status: z.string(),
    })
    .nullable()
    .optional(),
  salarii: z
    .object({
      max_salariu: z.number().nullable(),
      cost_anual: z.number().nullable(),
      nr_pers: z.number(),
    })
    .nullable()
    .optional(),
  mfin_2024: z
    .object({
      cifra_afaceri: z.number().nullable(),
      profit_net: z.number().nullable(),
      pierdere_neta: z.number().nullable(),
      nr_salariati: z.number().nullable(),
      capitaluri: z.number().nullable(),
    })
    .nullable()
    .optional(),
  subventie_2025_mii_lei: z.number().nullable().optional(),
  subventie_2025_sursa: z.string().nullable().optional(),
  derived_status: z.string().nullable().optional(),
  derived_status_2025: z.string().nullable().optional(),
});

const SubsidiesYearSchema = z.object({
  n_uats: z.number(),
  total_lei: z.number(),
  uats: z.array(
    z.object({
      cui: z.string(),
      name: z.string(),
      county: z.string(),
      total: z.number(),
    })
  ),
  judete: z.array(
    z.object({
      name: z.string(),
      tr: z.number(),
      te: z.number(),
      total: z.number(),
      n_uats: z.number(),
    })
  ),
});

const SubsidiesSchema = z.object({
  meta: z.object({
    years: z.array(z.number()),
  }),
  years: z.record(z.string(), SubsidiesYearSchema),
  operators: z.array(
    z.object({
      cui: z.string(),
      name: z.string(),
      uat_name: z.string().nullable(),
      sector: z.string(),
      subv: z.number(),
      ca: z.number(),
      profit: z.number(),
      pierdere: z.number(),
    })
  ),
  operators_2025: z.array(
    z.object({
      cui: z.string(),
      name: z.string(),
      uat_name: z.string().nullable(),
      sector: z.string(),
      subv: z.number(),
      ca: z.number(),
      profit: z.number(),
      pierdere: z.number(),
    })
  ),
});

const ListedSchema = z.object({
  listed_soes: z.array(
    z.object({
      ticker: z.string(),
      name: z.string(),
      listed: z.number(),
      stat_pct: z.number(),
      ministry: z.string(),
      yearly_profit: z.array(
        z.object({ an: z.number(), profit_mld_lei: z.number() })
      ),
      monthly_price: z.array(
        z.object({ ym: z.string(), price_lei: z.number() })
      ),
    })
  ),
});

const CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

async function getCached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  loader: () => Promise<Result<T, AppError>>
): Promise<Result<T, AppError>> {
  const cached = cache.get(key);
  if (cached !== undefined && cached.expiresAt > Date.now()) {
    return ok(cached.value);
  }
  const result = await loader();
  if (result.isOk()) {
    cache.set(key, {
      value: result.value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }
  return result;
}

/**
 * Live source: the public companiidestat.ro snapshot API (CC BY 4.0).
 * Endpoints serve static JSON snapshots, so responses are cached in memory
 * for a few minutes to be a good citizen of the upstream host.
 */
export class CompaniiDeStatSource implements SoeDataSource {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly aggregateCache = new Map<
    string,
    CacheEntry<SoeAggregateUpstream>
  >();
  private readonly sectorCache = new Map<
    string,
    CacheEntry<{ sectors: SectorUpstream[]; note: string }>
  >();
  private readonly subsidiesCache = new Map<
    string,
    CacheEntry<z.infer<typeof SubsidiesSchema>>
  >();
  private readonly listedCache = new Map<
    string,
    CacheEntry<z.infer<typeof ListedSchema>>
  >();
  private readonly companyCache = new Map<
    string,
    CacheEntry<CompanyUpstream>
  >();

  constructor(config: AppConfig) {
    this.baseUrl = config.soeBaseUrl;
    this.timeoutMs = config.soeTimeoutMs;
  }

  private async getJson(path: string): Promise<Result<unknown, AppError>> {
    try {
      const response = await fetch(`${this.baseUrl}/date/v1/${path}`, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        if (response.status === 404) {
          return err(notFound(`companiidestat: ${path} not found`));
        }
        return err(
          upstreamUnavailable(
            `companiidestat: HTTP ${response.status} for ${path}`
          )
        );
      }
      return ok(await response.json());
    } catch {
      return err(upstreamUnavailable(`companiidestat unreachable: ${path}`));
    }
  }

  private async loadAggregate(): Promise<
    Result<SoeAggregateUpstream, AppError>
  > {
    return getCached(this.aggregateCache, "data.json", async () => {
      const result = await this.getJson("data.json");
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = AggregateSchema.safeParse(result.value);
      if (!parsed.success) {
        return err(
          upstreamUnavailable("unexpected companiidestat data.json shape")
        );
      }
      return ok(parsed.data);
    });
  }

  async getSummary(): Promise<Result<SoeSummary, AppError>> {
    const result = await this.loadAggregate();
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(buildSummary(result.value));
  }

  async getSectorTrend(): Promise<Result<SoeSectorTrend, AppError>> {
    return getCached(this.sectorCache, "sector_trend.json", async () => {
      const result = await this.getJson("sector_trend.json");
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = SectorTrendSchema.safeParse(result.value);
      if (!parsed.success) {
        return err(upstreamUnavailable("unexpected sector_trend shape"));
      }
      return ok({
        sectors: parsed.data.sector_trend,
        note: parsed.data.note ?? "",
      });
    }).then((cached) =>
      cached.map((value) => buildSectorTrend(value.sectors, value.note))
    );
  }

  async getByCounty(): Promise<Result<SoeByCounty, AppError>> {
    const result = await this.loadAggregate();
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(
      buildByCounty(result.value.judete_2024, result.value.meta.latest_year)
    );
  }

  async getScatter(): Promise<Result<SoeScatter, AppError>> {
    const result = await this.loadAggregate();
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(
      buildScatter(result.value.scatter, result.value.meta.latest_year)
    );
  }

  async getCompany(cui: string): Promise<Result<SoeCompany, AppError>> {
    return getCached(this.companyCache, cui, async () => {
      const result = await this.getJson(`companii/${cui}.json`);
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = CompanySchema.safeParse(result.value);
      if (!parsed.success) {
        return err(notFound(`companiidestat: unknown company ${cui}`));
      }
      return ok(parsed.data);
    }).then((cached) => cached.map((value) => buildCompany(value)));
  }

  async getSubsidies(year?: string): Promise<Result<SoeSubsidies, AppError>> {
    return getCached(
      this.subsidiesCache,
      "subventii-locale-data.json",
      async () => {
        const result = await this.getJson("subventii-locale-data.json");
        if (result.isErr()) {
          return err(result.error);
        }
        const parsed = SubsidiesSchema.safeParse(result.value);
        if (!parsed.success) {
          return err(
            upstreamUnavailable("unexpected subventii-locale-data shape")
          );
        }
        return ok(parsed.data);
      }
    ).then((cached) => {
      if (cached.isErr()) {
        return err(cached.error);
      }
      const selectedYear = year ?? "2024";
      const yearData = cached.value.years[selectedYear];
      if (yearData === undefined) {
        return err(notFound(`subsidies: no data for year ${selectedYear}`));
      }
      const operators: SubsidyOperatorUpstream[] =
        selectedYear === "2024"
          ? cached.value.operators
          : cached.value.operators_2025;
      return ok(
        buildSubsidies(
          Number(selectedYear),
          yearData as SubsidiesUpstream,
          operators
        )
      );
    });
  }

  async getListed(): Promise<Result<SoeListed, AppError>> {
    return getCached(this.listedCache, "listed-soes.json", async () => {
      const result = await this.getJson("listed-soes.json");
      if (result.isErr()) {
        return err(result.error);
      }
      const parsed = ListedSchema.safeParse(result.value);
      if (!parsed.success) {
        return err(upstreamUnavailable("unexpected listed-soes shape"));
      }
      return ok(parsed.data);
    }).then((cached) =>
      cached.map((value) => buildListed(value.listed_soes as ListedUpstream[]))
    );
  }
}
