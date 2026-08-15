import {
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateFeeItemDto {
  @IsString()
  @Length(1, 255)
  itemName: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000_000)
  amount: number;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}
