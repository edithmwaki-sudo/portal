import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OtpService } from './otp.service';

@Module({
  imports: [JwtModule.register({})],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}