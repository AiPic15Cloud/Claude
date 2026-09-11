import { ApiProperty } from '@nestjs/swagger';
import { WaterfallTierType } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateWaterfallTierDto {
  @ApiProperty()
  @IsInt()
  order!: number;

  @ApiProperty({ enum: WaterfallTierType })
  @IsEnum(WaterfallTierType)
  type!: WaterfallTierType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  beneficiaryStakeholderId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  hurdleRatePct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  catchUpPct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sharePct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
