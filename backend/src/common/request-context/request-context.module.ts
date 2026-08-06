import {
  Module,
  type NestModule,
  type MiddlewareConsumer,
} from '@nestjs/common';
import type { RequestHandler } from 'express';
import { requestContext } from './request-context';
import { redact } from './redact';

/** Methods that carry a body worth auditing. */
const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

function createRequestContextMiddleware(): RequestHandler {
  return (req, _res, next) => {
    const requestId =
      (req.headers['x-request-id'] as string | undefined) ?? null;

    const store: { requestId: string | null; body?: unknown } = { requestId };

    if (
      MUTATING_METHODS.has(req.method) &&
      req.body &&
      typeof req.body === 'object'
    ) {
      store.body = redact(req.body);
    }

    requestContext.run(store, () => next());
  };
}

@Module({})
export class RequestContextModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(createRequestContextMiddleware()).forRoutes('*');
  }
}
