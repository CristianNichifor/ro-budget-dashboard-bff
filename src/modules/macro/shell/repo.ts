import type { AppConfig } from "../../../infra/config";
import type { MacroDataSource } from "../core/ports";
import { EurostatMacroSource } from "./eurostat-repo";

export function buildMacroSource(config: AppConfig): MacroDataSource {
  return new EurostatMacroSource(config);
}
