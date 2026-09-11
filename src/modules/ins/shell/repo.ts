import type { AppConfig } from "../../../infra/config";
import type { InsDataSource } from "../core/ports";
import { InsLoaderSource } from "./insloader-repo";
import { StaticInsSource } from "./static-ins-repo";

export function buildInsSource(config: AppConfig): InsDataSource {
  if (config.insDataSource === "insloader") {
    return new InsLoaderSource(config);
  }
  return new StaticInsSource();
}
