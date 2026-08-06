import { Injectable, Logger } from '@nestjs/common';

export interface OtpSendParams {
  destination: string;
  code: string;
  purpose: string;
}

export interface OtpSender {
  send(params: OtpSendParams): Promise<void>;
}

/**
 * Default in-process sender — logs the OTP instead of delivering it.
 * Swap in real Email/SMS senders behind the same `OtpSender` interface via
 * config (`OTP_EMAIL_PROVIDER`, `OTP_SMS_PROVIDER`); no provider is hardcoded.
 */
@Injectable()
export class ConsoleOtpSender implements OtpSender {
  private readonly logger = new Logger('OtpSender');

  async send({ destination, code, purpose }: OtpSendParams): Promise<void> {
    this.logger.log(`[${purpose}] OTP for ${destination}: ${code}`);
  }
}