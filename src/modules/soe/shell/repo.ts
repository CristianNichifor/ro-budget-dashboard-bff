import type { AppConfig } from "../../../infra/config";
import type { SoeDataSource } from "../core/ports";
import { CompaniiDeStatSource } from "./companiidestat-repo";

export function buildSoeSource(config: AppConfig): SoeDataSource {
  return new CompaniiDeStatSource(config);
}
