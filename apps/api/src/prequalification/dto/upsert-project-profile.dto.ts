import { ApiProperty } from '@nestjs/swagger';
import { PrequalAcquisitionStatus } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertProjectProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cadastralRef?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  postcode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  existingSurfaceSqm?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  createdSurfaceSqm?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  soldSurfaceSqm?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  lotCount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lotType?: string;

  @ApiProperty({ enum: PrequalAcquisitionStatus, required: false })
  @IsOptional()
  @IsEnum(PrequalAcquisitionStatus)
  acquisitionStatus?: PrequalAcquisitionStatus;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditionsPrecedent?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  acquisitionPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  worksDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  exitStrategy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  interimRevenueNote?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetTimeline?: string;

  @ApiProperty({ required: false, description: '[{ label, note }]' })
  @IsOptional()
  @IsArray()
  criticalDependencies?: Record<string, unknown>[];
}
