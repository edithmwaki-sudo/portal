import { IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateFeeItemDto {
  @IsString()
  @Length(1, 255)
  itemName: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}
