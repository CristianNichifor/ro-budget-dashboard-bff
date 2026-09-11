export interface AppConfig {
  nodeEnv: string;
  port: number;
  host: string;
  logLevel: string;
  corsOrigin: string;
  dataSource: "static" | "hackforfacts";
  hackForFactsBaseUrl: string;
  hackForFactsTimeoutMs: number;
}

const DEFAULT_PORT = 3000;

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const port = Number(env.PORT ?? DEFAULT_PORT);

  if (Number.isNaN(port)) {
    throw new Error(`Invalid PORT: ${env.PORT}`);
  }

  return {
    nodeEnv: env.NODE_ENV ?? "development",
    port,
    host: env.HOST ?? "127.0.0.1",
    logLevel: env.LOG_LEVEL ?? "info",
    corsOrigin: env.CORS_ORIGIN ?? "http://localhost:5173",
    dataSource: env.DATA_SOURCE === "hackforfacts" ? "hackforfacts" : "static",
    hackForFactsBaseUrl: env.HACK_FOR_FACTS_BASE_URL ?? "http://localhost:3001",
    hackForFactsTimeoutMs: Number(env.HACK_FOR_FACTS_TIMEOUT_MS ?? 3000),
  };
}
