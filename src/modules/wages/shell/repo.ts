import type { AppConfig } from "../../../infra/config";
import type { WageDataSource } from "../core/ports";
import { EurostatWageSource } from "./eurostat-wages-repo";

export function buildWageSource(config: AppConfig): WageDataSource {
  return new EurostatWageSource(config);
}
