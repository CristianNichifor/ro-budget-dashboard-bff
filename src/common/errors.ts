export interface AppError {
  code: "INVALID_INPUT" | "NOT_FOUND" | "UPSTREAM_UNAVAILABLE" | "INTERNAL";
  message: string;
}

export const notFound = (message: string): AppError => ({
  code: "NOT_FOUND",
  message,
});

export const upstreamUnavailable = (message: string): AppError => ({
  code: "UPSTREAM_UNAVAILABLE",
  message,
});

export const invalidInput = (message: string): AppError => ({
  code: "INVALID_INPUT",
  message,
});

export const internal = (message: string): AppError => ({
  code: "INTERNAL",
  message,
});
