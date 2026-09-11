import { Decimal } from "decimal.js";
import { ok, type Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import { SEED_COUNTY_INVESTMENTS } from "../../../common/seed-data";
import type { InvestmentsSource } from "../core/ports";
import type { InvestmentsByCounty } from "../core/types";

export class StaticInvestmentsSource implements InvestmentsSource {
  async getByCounty(): Promise<Result<InvestmentsByCounty, AppError>> {
    const total = SEED_COUNTY_INVESTMENTS.reduce(
      (sum, county) => sum.plus(county.amount),
      new Decimal(0)
    );

    return ok({
      year: 2026,
      total: total.toString(),
      counties: SEED_COUNTY_INVESTMENTS,
    });
  }
}
