import type { AppConfig } from "../../../infra/config";
import type { AdoptedBudgetDataSource } from "../core/ports";
import { CkanAdoptedSource } from "./ckan-repo";

export function buildAdoptedSource(config: AppConfig): AdoptedBudgetDataSource {
  return new CkanAdoptedSource(config);
}
