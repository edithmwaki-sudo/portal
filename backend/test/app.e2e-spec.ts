import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from './../src/auth/auth.controller';
import { AuthService } from './../src/auth/auth.service';
import { OtpService } from './../src/otp/otp.service';
import { JwtStrategy } from './../src/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from './../src/auth/guards/jwt-auth.guard';

const configStub = {
  get: jest.fn((key: string) =>
    key === 'JWT_ACCESS_SECRET' ? 'test-secret' : undefined,
  ),
};

const authServiceMock = {
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  changePassword: jest.fn(),
  completeOtpLogin: jest.fn(),
  me: jest.fn().mockResolvedValue({ id: 1, username: 'admin' }),
};

const otpServiceMock = {
  verifyLoginOtp: jest.fn(),
  requestLoginChallenge: jest.fn(),
};

describe('AuthController (integration)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: 'test-secret' }),
      ],
      controllers: [AuthController],
      providers: [
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: AuthService, useValue: authServiceMock },
        { provide: OtpService, useValue: otpServiceMock },
        { provide: ConfigService, useValue: configStub },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  const validToken = () =>
    jwtService.sign({
      sub: 1,
      username: 'admin',
      email: 'admin@x.test',
      roleId: 7,
      sessionUuid: 'session-1',
      permissions: ['roles.view'],
      mustResetPassword: false,
      twoFactorEnabled: false,
      type: 'access',
    });

  it('rejects an authenticated route without a token (401)', async () => {
    await http().get('/auth/me').expect(401);
  });

  it('accepts a valid access token on /auth/me', async () => {
    await http()
      .get('/auth/me')
      .set('Authorization', `Bearer ${validToken()}`)
      .expect(200)
      .expect({ id: 1, username: 'admin' });
  });

  it('rejects an invalid login body (400 with field errors)', async () => {
    await http()
      .post('/auth/login')
      .send({ usernameOrEmail: 'admin' })
      .expect(400)
      .expect((res) => {
        expect(Array.isArray(res.body.message)).toBe(true);
        expect(res.body.message.join(',')).toContain('password');
      });
  });

  it('rejects unknown extra fields (whitelist + forbidNonWhitelisted)', async () => {
    await http()
      .post('/auth/login')
      .send({ usernameOrEmail: 'admin', password: 'x', evil: true })
      .expect(400);
  });

  it('logs in and sets httpOnly auth cookies', async () => {
    authServiceMock.login.mockResolvedValue({
      requiresTwoFactor: false,
      accessToken: 'at',
      refreshToken: 'rt',
      expiresIn: 1200,
      user: { id: 1 },
    });
    const res = await http()
      .post('/auth/login')
      .send({ usernameOrEmail: 'admin', password: 'password123' })
      .expect(200);
    const setCookie = (res.headers['set-cookie'] || []).join(';');
    expect(setCookie).toContain('access_token=at');
    expect(setCookie).toContain('refresh_token=rt');
    expect(setCookie).toContain('HttpOnly');
  });

  it('returns a 2FA challenge body when two-factor is required', async () => {
    authServiceMock.login.mockResolvedValue({
      requiresTwoFactor: true,
      loginToken: 'challenge-token',
    });
    await http()
      .post('/auth/login')
      .send({ usernameOrEmail: 'admin', password: 'password123' })
      .expect(200)
      .expect({ requiresTwoFactor: true, loginToken: 'challenge-token' });
  });

  it('rejects a malformed OTP code in verify-otp (400)', async () => {
    await http()
      .post('/auth/verify-otp')
      .send({ loginToken: 'abc', code: '12' })
      .expect(400);
  });
});