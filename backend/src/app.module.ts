import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { LogsModule } from './logs/logs.module';
import { OtpModule } from './otp/otp.module';
import { SessionsModule } from './sessions/sessions.module';
import { StudentsModule } from './students/students.module';
import { StaffModule } from './staff/staff.module';
import { DepartmentsModule } from './departments/departments.module';
import { CertificationModule } from './certification/certification.module';
import { CurriculumModule } from './curriculum/curriculum.module';
import { CoursesModule } from './courses/courses.module';
import { UnitsModule } from './units/units.module';
import { AcademicYearsModule } from './academic-years/academic-years.module';
import { AcademicSessionsModule } from './academic-sessions/academic-sessions.module';
import { CalendarModule } from './calendar/calendar.module';
import { LectureRoomsModule } from './lecture-rooms/lecture-rooms.module';
import { TimetablesModule } from './timetables/timetables.module';
import { AttendanceModule } from './attendance/attendance.module';
// NOTE: request-body audit capture is deferred — revisit later.
// import { RequestContextModule } from './common/request-context/request-context.module';
import { getLogFilePath } from './logs/log-file';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["set-cookie"]',
            'res.headers["set-cookie"]',
            'req.body.password',
            'req.body.refreshToken',
            'req.body.code',
            '*.password',
            '*.refreshToken',
            '*.code',
          ],
          censor: '[REDACTED]',
        },
        transport: {
          targets: [
            // Pretty console output in dev; JSON lines on stdout in prod.
            ...(process.env.NODE_ENV === 'production'
              ? []
              : [
                  {
                    target: 'pino-pretty',
                    options: { singleLine: true, translateTime: 'HH:MM:ss' },
                  },
                ]),
            // Always mirror JSON lines to disk so the app logs are queryable
            // through GET /logs (Security > App Logs).
            {
              target: 'pino/file',
              options: {
                destination: getLogFilePath(),
                mkdir: true,
                append: true,
              },
            },
          ],
        },
        autoLogging: {
          ignore: (req: { url?: string }) => {
            const url = req.url ?? '';
            return url.startsWith('/api/docs') || url.startsWith('/logs');
          },
        },
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60_000,
          limit: 100,
        },
      ],
      errorMessage: 'Too many requests. Please try again later.',
      skipIf: (ctx) => {
        const req = ctx.switchToHttp().getRequest<{ url?: string }>();
        const url = req.url ?? '';
        return url.startsWith('/api/docs');
      },
    }),
    PrismaModule,
    AuditModule,
    OtpModule,
    AuthModule,
    UsersModule,
    PermissionsModule,
    RolesModule,
    SessionsModule,
    StudentsModule,
    StaffModule,
    DepartmentsModule,
    CertificationModule,
CurriculumModule,
CoursesModule,
UnitsModule,
AcademicYearsModule,
AcademicSessionsModule,
CalendarModule,
LectureRoomsModule,
TimetablesModule,
AttendanceModule,
LogsModule,
    // NOTE: request-body audit capture is deferred — revisit later.
    // RequestContextModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
