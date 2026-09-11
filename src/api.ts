import { buildApp } from "./app/build-app";
import { loadConfig } from "./infra/config";
import { buildLogger } from "./infra/logger";

const config = loadConfig(process.env);
const logger = buildLogger(config.logLevel);

const app = buildApp({ config });

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  logger.error(error, "failed to start server");
  process.exit(1);
}
