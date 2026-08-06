import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { OtpService, OTP_LOGIN_PURPOSE } from './otp.service';
import { PrismaService } from '../prisma/prisma.service';
import * as cryptoUtil from '../common/utils/crypto.util';

jest.mock('../common/utils/crypto.util');

const mockGenerateOtp = cryptoUtil.generateOtp as jest.Mock;
const mockHashPassword = cryptoUtil.hashPassword as jest.Mock;
const mockVerifyPassword = cryptoUtil.verifyPassword as jest.Mock;

const prismaMock = {
  user: { findUnique: jest.fn() },
  otpCode: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const jwtMock = {
  sign: jest.fn(),
  verifyAsync: jest.fn(),
};

const configMock = {
  get: jest.fn((key: string) => undefined),
};

describe('OtpService', () => {
  let service: OtpService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGenerateOtp.mockReturnValue('123456');
    mockHashPassword.mockResolvedValue('hashed-code');
    mockVerifyPassword.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: configMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();

    service = module.get(OtpService);
  });

  describe('requestLoginChallenge', () => {
    it('creates a hashed OTP and returns a challenge token', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 5, email: 'u@x.test' });
      prismaMock.otpCode.create.mockResolvedValue({ id: 11 });
      jwtMock.sign.mockReturnValue('challenge-token');

      const result = await service.requestLoginChallenge(5);

      expect(result).toEqual({ requiresTwoFactor: true, loginToken: 'challenge-token' });
      expect(prismaMock.otpCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 5,
          codeHash: 'hashed-code',
          purpose: OTP_LOGIN_PURPOSE,
          maxAttempts: 5,
        }),
      });
      expect(jwtMock.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 5, otpId: 11, type: 'otp-login' }),
        expect.objectContaining({ secret: 'dev-refresh-secret' }),
      );
    });

    it('throws when the user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.requestLoginChallenge(999)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prismaMock.otpCode.create).not.toHaveBeenCalled();
    });
  });

  describe('verifyLoginOtp', () => {
    beforeEach(() => {
      prismaMock.otpCode.findUnique.mockResolvedValue({
        id: 11,
        userId: 5,
        purpose: OTP_LOGIN_PURPOSE,
        codeHash: 'hashed-code',
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 60_000),
        verifiedAt: null,
      });
      jwtMock.verifyAsync.mockResolvedValue({ sub: 5, otpId: 11, type: 'otp-login' });
      prismaMock.user.findUnique.mockResolvedValue({ id: 5, username: 'u' });
    });

    it('verifies a correct code and marks the OTP used', async () => {
      const user = await service.verifyLoginOtp('challenge-token', '123456');
      expect(user).toEqual({ id: 5, username: 'u' });
      expect(prismaMock.otpCode.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: { verifiedAt: expect.any(Date) } }),
      );
    });

    it('rejects an invalid challenge token', async () => {
      jwtMock.verifyAsync.mockRejectedValue(new Error('jwt expired'));
      await expect(
        service.verifyLoginOtp('bad-token', '123456'),
      ).rejects.toThrow('Invalid or expired login challenge');
    });

    it('rejects a token of the wrong type', async () => {
      jwtMock.verifyAsync.mockResolvedValue({ sub: 5, otpId: 11, type: 'access' });
      await expect(
        service.verifyLoginOtp('challenge-token', '123456'),
      ).rejects.toThrow('Invalid login challenge');
    });

    it('rejects an already-used OTP', async () => {
      prismaMock.otpCode.findUnique.mockResolvedValue({
        id: 11,
        userId: 5,
        purpose: OTP_LOGIN_PURPOSE,
        codeHash: 'hashed-code',
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 60_000),
        verifiedAt: new Date(),
      });
      await expect(
        service.verifyLoginOtp('challenge-token', '123456'),
      ).rejects.toThrow('already used');
    });

    it('rejects an expired OTP', async () => {
      prismaMock.otpCode.findUnique.mockResolvedValue({
        id: 11,
        userId: 5,
        purpose: OTP_LOGIN_PURPOSE,
        codeHash: 'hashed-code',
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() - 1000),
        verifiedAt: null,
      });
      await expect(
        service.verifyLoginOtp('challenge-token', '123456'),
      ).rejects.toThrow('expired');
    });

    it('rejects when the attempt limit is exhausted', async () => {
      prismaMock.otpCode.findUnique.mockResolvedValue({
        id: 11,
        userId: 5,
        purpose: OTP_LOGIN_PURPOSE,
        codeHash: 'hashed-code',
        attempts: 5,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 60_000),
        verifiedAt: null,
      });
      await expect(
        service.verifyLoginOtp('challenge-token', '123456'),
      ).rejects.toThrow('Too many attempts');
    });

    it('rejects an incorrect code and increments the attempt counter', async () => {
      mockVerifyPassword.mockResolvedValue(false);
      await expect(
        service.verifyLoginOtp('challenge-token', '000000'),
      ).rejects.toThrow('Incorrect code');
      expect(prismaMock.otpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { attempts: { increment: 1 } } }),
      );
    });
  });
});