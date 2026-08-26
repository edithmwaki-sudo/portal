import { ValidationPipe } from '@nestjs/common';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/** Parse the comma-separated allowlist from `CORS_ORIGINS` into a trimmed array. */
function parseOriginList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  // Fail fast: no silent fallbacks for signing keys. A missing secret in prod
  // must stop startup rather than issue unsigned-token-signed sessions.
  const requiredSecrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missingSecrets = requiredSecrets.filter((key) => !process.env[key]);
  if (missingSecrets.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missingSecrets.join(', ')}`,
    );
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  // Hardening headers (CSP, X-Frame-Options, HSTS, etc.).
  app.use(helmet());

  // Gatekeeper: only origins explicit listed in CORS_ORIGINS (.env) may call the API.
  // Requests WITHOUT an Origin header (curl, mobile apps, server-to-server) are allowed.
  const allowedOrigins = parseOriginList(process.env.CORS_ORIGINS);

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      res.status(403).json({
        statusCode: 403,
        message: `Origin '${origin}' is not allowed by CORS policy`,
      });
      return;
    }
    next();
  });

  app.enableCors({
    // Browser-side gatekeeper: reflect the origin only if it is allowlisted.
    origin: (origin, callback) => {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
    maxAge: 86400,
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new AllExceptionsFilter());

  // API documentation. Public in development; in production it is disabled
  // unless explicitly opted into via ENABLE_SWAGGER=true (e.g. for a staged
  // environment behind other protections). Override via env, not code.
  if (
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true'
  ) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Apex ERP API')
      .setDescription(
        'Authentication & authorization API for the School Management System',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addCookieAuth('access_token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}

// Single API process per container/instance. Heavy CPU work (PDF rendering)
// already runs on a bounded worker-thread pool; background jobs belong to
// dedicated workers, never to extra API processes. Scale horizontally by
// running more instances behind a load balancer when measurements demand it.
void bootstrap();
