import type { Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import type { LabourContext } from "./types";

export interface LabourDataSource {
  getContext(): Promise<Result<LabourContext, AppError>>;
}
