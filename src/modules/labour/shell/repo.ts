import type { AppConfig } from "../../../infra/config";
import type { LabourDataSource } from "../core/ports";
import { EurostatLabourSource } from "./eurostat-labour-repo";

export function buildLabourSource(config: AppConfig): LabourDataSource {
  return new EurostatLabourSource(config);
}
