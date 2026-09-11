import type { AppConfig } from "../../../infra/config";
import type { JusticeDataSource } from "../core/ports";
import { EurostatJusticeSource } from "./eurostat-justice-repo";

export function buildJusticeSource(config: AppConfig): JusticeDataSource {
  return new EurostatJusticeSource(config);
}
