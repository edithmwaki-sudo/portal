import { IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateFeeItemDto {
  @IsString()
  @Length(1, 255)
  @IsOptional()
  itemName?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}
