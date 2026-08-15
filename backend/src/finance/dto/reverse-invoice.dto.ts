import { IsString, Length } from 'class-validator';

export class ReverseInvoiceDto {
  @IsString()
  @Length(1, 255)
  reason: string;
}
