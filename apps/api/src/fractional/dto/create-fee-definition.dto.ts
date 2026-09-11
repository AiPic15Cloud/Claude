import { ApiProperty } from '@nestjs/swagger';
import { FeeCalculationBase, FeeFrequency, FeeType } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFeeDefinitionDto {
  @ApiProperty()
  @IsString()
  stakeholderId!: string;

  @ApiProperty({ enum: FeeType })
  @IsEnum(FeeType)
  feeType!: FeeType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  ratePct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  fixedAmount?: number;

  @ApiProperty({ required: false, enum: FeeCalculationBase })
  @IsOptional()
  @IsEnum(FeeCalculationBase)
  calculationBase?: FeeCalculationBase;

  @ApiProperty({ required: false, enum: FeeFrequency })
  @IsOptional()
  @IsEnum(FeeFrequency)
  frequency?: FeeFrequency;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  startYear?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  endYear?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  triggerNote?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  confidence?: string;
}
