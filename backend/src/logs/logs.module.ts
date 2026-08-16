import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { RequestMetricsMiddleware } from './request-metrics.middleware';
import { RequestMetricsService } from './request-metrics.service';

@Module({
  controllers: [LogsController],
  providers: [LogsService, RequestMetricsService, RequestMetricsMiddleware],
})
export class LogsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestMetricsMiddleware).forRoutes('*');
  }
}
