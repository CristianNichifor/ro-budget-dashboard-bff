import type { Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import type { JusticeContext } from "./types";

export interface JusticeDataSource {
  getContext(): Promise<Result<JusticeContext, AppError>>;
}
