import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateOtp, hashPassword, verifyPassword } from '../common/utils/crypto.util';
import { ConsoleOtpSender, type OtpSender } from './providers/otp-sender.interface';

export const OTP_LOGIN_PURPOSE = 'login_2fa';

interface OtpLoginPayload {
  sub: number;
  otpId: number;
  type: 'otp-login';
}

@Injectable()
export class OtpService {
  private readonly sender: OtpSender;
  private readonly ttlMinutes: number;
  private readonly maxAttempts: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    // Providers are swapped behind the `OtpSender` interface via config;
    // ConsoleOtpSender is the safe default (logs instead of sending).
    this.sender = new ConsoleOtpSender();
    this.maxAttempts = this.int('OTP_MAX_ATTEMPTS', 5);
    this.ttlMinutes = this.int('OTP_EXPIRES_IN_MINUTES', 5);
  }

  private get otpSecret(): string {
    return this.config.get<string>('JWT_OTP_SECRET') ?? this.refreshSecret();
  }

  /**
   * Begins a 2FA login for a user who has twoFactorEnabled. No JWT is issued
   * here — just an OTP plus a short-lived login challenge.
   */
  async requestLoginChallenge(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + this.ttlMinutes * 60_000);

    const otp = await this.prisma.otpCode.create({
      data: {
        userId: user.id,
        codeHash: await hashPassword(code),
        purpose: OTP_LOGIN_PURPOSE,
        deliveryMethod: 'email',
        destination: user.email,
        maxAttempts: this.maxAttempts,
        expiresAt,
      },
    });

    await this.sender.send({
      destination: user.email,
      code,
      purpose: OTP_LOGIN_PURPOSE,
    });

    const loginToken = this.jwt.sign(
      { sub: user.id, otpId: otp.id, type: 'otp-login' },
      { secret: this.otpSecret, expiresIn: `${this.ttlMinutes}m` },
    );

    return { requiresTwoFactor: true, loginToken };
  }

  /** Validates an OTP against its challenge. Returns the user on success. */
  async verifyLoginOtp(loginToken: string, code: string): Promise<User> {
    let payload: OtpLoginPayload;
    try {
      payload = (await this.jwt.verifyAsync(loginToken, {
        secret: this.otpSecret,
      })) as OtpLoginPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired login challenge');
    }

    if (payload.type !== 'otp-login') {
      throw new UnauthorizedException('Invalid login challenge');
    }

    const otp = await this.prisma.otpCode.findUnique({ where: { id: payload.otpId } });
    if (!otp || otp.purpose !== OTP_LOGIN_PURPOSE || otp.verifiedAt) {
      throw new UnauthorizedException('Invalid or already used code');
    }
    if (otp.expiresAt < new Date()) {
      throw new UnauthorizedException('Code has expired');
    }
    if (otp.attempts >= otp.maxAttempts) {
      throw new UnauthorizedException('Too many attempts — request a new code');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    const ok = await verifyPassword(String(code), otp.codeHash);
    if (!ok) {
      throw new UnauthorizedException('Incorrect code');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { verifiedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { id: otp.userId } });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return user;
  }

  private int(key: string, fallback: number): number {
    const value = this.config.get<string>(key);
    return value ? parseInt(value, 10) : fallback;
  }

  private refreshSecret(): string {
    return this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret';
  }
}