import { ApiProperty } from '@nestjs/swagger';
import { PrequalLotStatus } from '@prisma/client';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertLotDto {
  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assetType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  surfaceSqm?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  askingPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedPrice?: number;

  @ApiProperty({ enum: PrequalLotStatus, required: false })
  @IsOptional()
  @IsEnum(PrequalLotStatus)
  status?: PrequalLotStatus;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditionsPrecedent?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  buyerFinancingStatus?: string;
}
