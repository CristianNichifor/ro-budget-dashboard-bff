import type { AppConfig } from "../../../infra/config";
import type { InvestmentsSource } from "../core/ports";
import { StaticInvestmentsSource } from "./static-repo";

export function buildInvestmentsSource(_config: AppConfig): InvestmentsSource {
  return new StaticInvestmentsSource();
}
