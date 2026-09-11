import type { AppConfig } from "../../../infra/config";
import type { InsDataSource } from "../core/ports";
import { EurostatInsSource } from "./eurostat-ins-repo";
import { InsLoaderSource } from "./insloader-repo";
import { StaticInsSource } from "./static-ins-repo";

export function buildInsSource(config: AppConfig): InsDataSource {
  if (config.insDataSource === "insloader") {
    return new InsLoaderSource(config);
  }
  if (config.insDataSource === "eurostat") {
    return new EurostatInsSource(config);
  }
  return new StaticInsSource();
}
