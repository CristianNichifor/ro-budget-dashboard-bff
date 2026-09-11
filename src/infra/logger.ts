import { pino, type Logger } from "pino";

export function buildLogger(level: string): Logger {
  return pino({ level });
}

export type { Logger };
