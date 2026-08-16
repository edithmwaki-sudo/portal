import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

export interface MetricsInterval {
  intervalMs: number;
  startedAt: number;
  requests: number;
  status: { '2xx': number; '3xx': number; '4xx': number; '5xx': number };
  errors: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  eventLoopLagMs: number;
  topRoutes: { route: string; count: number; avgMs: number }[];
}

const MAX_SAMPLES = 20_000;

/**
 * Tracks per-worker request aggregates in memory and emits ONE structured
 * summary line per interval instead of a line per request. Success traffic
 * is suppressed from the request log entirely, so this is what an operator
 * actually reads day-to-day.
 */
@Injectable()
export class RequestMetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RequestMetricsService.name);

  private requests = 0;
  private errors = 0;
  private readonly status = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
  private readonly durations: number[] = [];
  private readonly routeStats = new Map<
    string,
    { count: number; totalMs: number }
  >();
  private intervalMs = 60_000;
  private startedAt = Date.now();
  private lagMs = 0;
  private lagSampledAt = 0;
  private timer?: NodeJS.Timeout;

  onModuleInit(): void {
    const configured = Number(process.env.METRICS_INTERVAL_MS ?? 60_000);
    this.intervalMs =
      Number.isFinite(configured) && configured > 0 ? configured : 60_000;
    this.sampleLag();
    this.timer = setInterval(() => this.flush(), this.intervalMs);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  record(statusCode: number, durationMs: number, route: string): void {
    this.requests++;
    const bucket = (statusCode < 200 || statusCode >= 500
      ? '5xx'
      : statusCode < 300
        ? '2xx'
        : statusCode < 400
          ? '3xx'
          : '4xx') as keyof typeof this.status;
    this.status[bucket]++;
    if (statusCode >= 500) this.errors++;

    if (this.durations.length >= MAX_SAMPLES) this.durations.shift();
    this.durations.push(durationMs);

    const stats = this.routeStats.get(route);
    if (stats) {
      stats.count++;
      stats.totalMs += durationMs;
    } else {
      this.routeStats.set(route, { count: 1, totalMs: durationMs });
    }
  }

  /**
   * Event-loop lag is measured asynchronously: schedule a 1ms timer, then
   * measure how late it actually fired. The value read on the *next* flush.
   */
  private sampleLag(): void {
    const firedAt = Date.now();
    setTimeout(() => {
      const now = Date.now();
      this.lagMs = now - firedAt - 1;
      this.lagSampledAt = now;
    }, 1);
  }

  private flush(): void {
    const total = this.requests;
    const sorted = [...this.durations].sort((a, b) => a - b);
    const percentile = (p: number): number =>
      sorted.length
        ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]
        : 0;

    const topRoutes = [...this.routeStats.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([route, s]) => ({
        route,
        count: s.count,
        avgMs: Math.round(s.totalMs / s.count),
      }));

    const summary: MetricsInterval = {
      intervalMs: this.intervalMs,
      startedAt: this.startedAt,
      requests: total,
      status: { ...this.status },
      errors: this.errors,
      p50Ms: Math.round(percentile(50)),
      p95Ms: Math.round(percentile(95)),
      maxMs: sorted.length ? Math.round(sorted[sorted.length - 1]) : 0,
      eventLoopLagMs: this.lagSampledAt >= this.startedAt ? this.lagMs : 0,
      topRoutes,
    };

    // Only log when there was actual traffic so idle workers stay quiet.
    if (total > 0) {
      this.logger.log(summary, 'request-metrics');
    }

    this.requests = 0;
    this.errors = 0;
    this.status['2xx'] = 0;
    this.status['3xx'] = 0;
    this.status['4xx'] = 0;
    this.status['5xx'] = 0;
    this.durations.length = 0;
    this.routeStats.clear();
    this.startedAt = Date.now();
    this.sampleLag();
  }
}
