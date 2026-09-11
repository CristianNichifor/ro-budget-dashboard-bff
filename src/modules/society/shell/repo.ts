import type { AppConfig } from "../../../infra/config";
import type { SocietyDataSource } from "../core/ports";
import { EurostatSocietySource } from "./society-repo";

export function buildSocietySource(config: AppConfig): SocietyDataSource {
  return new EurostatSocietySource(config);
}
