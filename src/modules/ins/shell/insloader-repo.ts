import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { AppConfig } from "../../../infra/config";
import type { AppError } from "../../../common/errors";
import { SEED_INS_METRICS } from "../../../common/seed-data";
import type { InsCatalogEntry, InsMetric } from "../core/types";
import type { InsDataSource } from "../core/ports";

/**
 * Best-effort client for transparenta-eu-ins-loader.
 *
 * The loader exposes /statistics/:code (single indicator) and /trends/:code
 * (time series). The exact response envelope must be verified against the
 * live instance before DATA_SOURCE_INS=insloader is used.
 */

const StatisticsResponseSchema = z.object({
  code: z.string(),
  name: z.string().optional(),
  unit: z.string().optional(),
  values: z.array(
    z.object({
      year: z.number().int(),
      value: z.number(),
    })
  ),
});

export class InsLoaderSource implements InsDataSource {
  constructor(private readonly config: AppConfig) {}

  /**
   * The loader serves series only, so the catalog (labels/units) comes from
   * the local metadata seed. Replace with loader discovery once available.
   */
  async getCatalog(): Promise<Result<InsCatalogEntry[], AppError>> {
    return ok(
      SEED_INS_METRICS.map(({ code, label, unit }) => ({ code, label, unit }))
    );
  }

  async getMetric(code: string): Promise<Result<InsMetric, AppError>> {
    try {
      const response = await fetch(
        `${this.config.insLoaderBaseUrl}/statistics/${encodeURIComponent(code)}`,
        { signal: AbortSignal.timeout(this.config.insLoaderTimeoutMs) }
      );

      if (!response.ok) {
        return err({
          code: "UPSTREAM_UNAVAILABLE",
          message: `ins-loader responded with ${response.status}`,
        });
      }

      const parsed = StatisticsResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        return err({
          code: "UPSTREAM_UNAVAILABLE",
          message: "unexpected ins-loader response shape",
        });
      }

      return ok({
        code,
        unit: parsed.data.unit ?? "",
        label: parsed.data.name ?? code,
        data: parsed.data.values.map((point) => ({
          year: point.year,
          value: point.value,
        })),
      });
    } catch {
      return err({
        code: "UPSTREAM_UNAVAILABLE",
        message: "could not reach transparenta-eu-ins-loader",
      });
    }
  }
}
