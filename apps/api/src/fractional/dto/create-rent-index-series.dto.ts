import { ApiProperty } from '@nestjs/swagger';
import { RentIndexType } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRentIndexSeriesDto {
  @ApiProperty({ enum: RentIndexType })
  @IsEnum(RentIndexType)
  indexType!: RentIndexType;

  @ApiProperty({ description: 'ex. "2026-T2"' })
  @IsString()
  period!: string;

  @ApiProperty()
  @IsNumber()
  value!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  cagr5y?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  cagr10y?: number;

  @ApiProperty()
  @IsDateString()
  asOfDate!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  source?: string;
}
