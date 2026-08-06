import { join } from 'node:path';

/**
 * Absolute path to the app's JSON log file. Shared by the pino file transport
 * (which writes request + application logs) and the LogsService (which tails
 * the file for the `/logs` endpoint). Overridable via the `LOG_FILE` env var;
 * defaults to `<backend>/logs/app.log`.
 */
export function getLogFilePath(): string {
  const configured = process.env.LOG_FILE;
  return configured
    ? join(process.cwd(), configured)
    : join(process.cwd(), 'logs', 'app.log');
}
