import { ok, type Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import { SEED_INS_METRICS } from "../../../common/seed-data";
import type { InsMetric } from "../core/types";
import type { InsDataSource } from "../core/ports";

export class StaticInsSource implements InsDataSource {
  async getMetric(code: string): Promise<Result<InsMetric, AppError>> {
    const metric = SEED_INS_METRICS.find((item) => item.code === code);

    if (metric === undefined) {
      return ok({ code, unit: "", label: code, data: [] });
    }

    return ok(metric);
  }
}
