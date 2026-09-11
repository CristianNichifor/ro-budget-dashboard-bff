import type { Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import type { EnergyContext } from "./types";

export interface EnergyDataSource {
  getContext(): Promise<Result<EnergyContext, AppError>>;
}
