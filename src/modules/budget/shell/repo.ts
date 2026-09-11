import type { AppConfig } from "../../../infra/config";
import type { BudgetDataSource } from "../core/ports";
import { HackForFactsSource } from "./hackforfacts-repo";
import { StaticBudgetSource } from "./static-repo";

export function buildBudgetSource(config: AppConfig): BudgetDataSource {
  if (config.dataSource === "hackforfacts") {
    return new HackForFactsSource(config);
  }
  return new StaticBudgetSource();
}
