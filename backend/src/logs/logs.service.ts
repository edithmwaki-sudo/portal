import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { getLogFilePath } from './log-file';

export interface AppLogEntry {
  id: number;
  time: string;
  level: string;
  message: string;
  context?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  [key: string]: unknown;
}

interface ParsedLog {
  time: string;
  level: string;
  message: string;
  context?: string;
  raw: Record<string, unknown>;
}

const LEVEL_LABELS: Record<string, string> = {
  '10': 'trace',
  '20': 'debug',
  '30': 'info',
  '40': 'warn',
  '50': 'error',
  '60': 'fatal',
};

function formatTime(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return '';
}

function normalizeLevel(value: unknown): string {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;
  const fromCode = Number.isFinite(numeric) ? LEVEL_LABELS[numeric] : undefined;
  if (fromCode) return fromCode;
  return typeof value === 'string' && value !== '' ? value : 'info';
}

function parseLogLine(line: string): ParsedLog | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    // Not JSON (e.g. a stray non-pino line) — surface it as a raw entry.
    return { time: '', level: 'info', message: trimmed, raw: { raw: trimmed } };
  }

  const level = normalizeLevel(parsed.level);
  const message =
    typeof parsed.msg === 'string'
      ? parsed.msg
      : typeof parsed.message === 'string'
        ? parsed.message
        : '';

  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (key !== 'level' && key !== 'msg' && key !== 'message')
      rest[key] = value;
  }

  return {
    time: formatTime(parsed.time ?? parsed.timestamp),
    level,
    message,
    context: typeof parsed.context === 'string' ? parsed.context : undefined,
    raw: rest,
  };
}

/** Reads only the last `tailBytes` bytes of a file (cheap enough for /logs). */
async function readTail(
  filePath: string,
  tailBytes = 4 * 1024 * 1024,
): Promise<string> {
  const { size } = statSync(filePath);
  const start = Math.max(0, size - tailBytes);
  const stream = createReadStream(filePath, { start, encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  const lines: string[] = [];
  for await (const line of rl) {
    lines.push(line);
  }

  // If we started mid-line (tail truncation), the first partial line is dropped.
  let content = lines.join('\n');
  if (start > 0) {
    const firstNewline = content.indexOf('\n');
    if (firstNewline !== -1) content = content.slice(firstNewline + 1);
  }
  return content;
}

/**
 * Tails the pino JSON log file and serves parsed entries, newest first, with
 * in-memory pagination + substring filtering.
 */
@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor() {
    if (!existsSync(getLogFilePath())) {
      this.logger.warn(`Log file not found yet: ${getLogFilePath()}`);
    }
  }

  async findAll(
    page = 1,
    limit = 25,
    search?: string,
  ): Promise<{
    items: AppLogEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filePath = getLogFilePath();
    if (!existsSync(filePath)) {
      throw new NotFoundException('Application log file not found');
    }

    let content: string;
    try {
      content = await readTail(filePath);
    } catch {
      // The file may be locked / rotating — fall back to a full read.
      content = await readFile(filePath, 'utf8');
    }

    const entries = content
      .split('\n')
      .map(parseLogLine)
      .filter((entry): entry is ParsedLog => entry !== null);

    // Newest log line first.
    entries.reverse();

    const needle = search?.trim().toLowerCase();
    const filtered = needle
      ? entries.filter((entry) =>
          JSON.stringify(entry.raw).toLowerCase().includes(needle),
        )
      : entries;

    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit).map((entry, index) => ({
      id: total - start - index,
      time: entry.time,
      level: entry.level,
      message: entry.message,
      ...(entry.context ? { context: entry.context } : {}),
      ...entry.raw,
    }));

    return { items, total, page, limit };
  }
}
