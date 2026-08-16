import { ValidationPipe } from '@nestjs/common';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cluster from 'cluster';
import * as os from 'os';
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

  // API documentation (available at /api/docs).
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

  await app.listen(process.env.PORT ?? 3000);
}

// Multi-process mode: fork one worker per logical CPU (override with WORKERS).
// Each worker owns its own Prisma engine + connection pool, so throughput
// scales with cores. Set WORKERS=1 to run a single process (default is all CPUs).
if (cluster.isPrimary) {
  const requested = Number(process.env.WORKERS);
  const workerCount =
    Number.isFinite(requested) && requested >= 1
      ? Math.floor(requested)
      : os.cpus().length;
  console.log(`[primary ${process.pid}] forking ${workerCount} worker(s)`);
  for (let i = 0; i < workerCount; i++) cluster.fork();
  cluster.on('exit', (worker, code, signal) => {
    console.log(
      `[primary] worker ${worker.process.pid} exited (code=${code} signal=${signal}); restarting`,
    );
    cluster.fork();
  });
} else {
  bootstrap();
}
