import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateRepaymentDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiProperty({ required: false, default: false, description: 'true = estimation future, false = remboursement réalisé' })
  @IsOptional()
  @IsBoolean()
  projected?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
