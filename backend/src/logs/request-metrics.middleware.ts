import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { RequestMetricsService } from './request-metrics.service';

/**
 * Feeds per-request aggregates into RequestMetricsService without writing a
 * log line per request. Route is the URL path (query excluded) so the
 * periodic summary stays compact and stable.
 */
@Injectable()
export class RequestMetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: RequestMetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const url = req.originalUrl ?? req.url ?? '';
    if (url.startsWith('/api/docs') || url.startsWith('/logs')) {
      next();
      return;
    }

    const route = url.split('?')[0];
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      this.metrics.record(res.statusCode, durationMs, route);
    });
    next();
  }
}
