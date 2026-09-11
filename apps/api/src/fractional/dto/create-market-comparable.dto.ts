import { ApiProperty } from '@nestjs/swagger';
import { MarketComparableType } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMarketComparableDto {
  @ApiProperty()
  @IsString()
  commune!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  secteur?: string;

  @ApiProperty({ enum: MarketComparableType })
  @IsEnum(MarketComparableType)
  type!: MarketComparableType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  valeurM2?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  yieldPct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  surfaceM2?: number;

  @ApiProperty()
  @IsDateString()
  asOfDate!: string;

  @ApiProperty()
  @IsString()
  source!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, description: 'Dossier Fractionné depuis lequel ce comparable a été ajouté manuellement, le cas échéant.' })
  @IsOptional()
  @IsString()
  addedByProjectId?: string;
}
