import type { AppConfig } from "../../../infra/config";
import type { EnergyDataSource } from "../core/ports";
import { EurostatEnergySource } from "./eurostat-energy-repo";

export function buildEnergySource(config: AppConfig): EnergyDataSource {
  return new EurostatEnergySource(config);
}
