import { IsString, Length } from 'class-validator';

export class ReversePaymentDto {
  @IsString()
  @Length(1, 255)
  reason: string;
}
