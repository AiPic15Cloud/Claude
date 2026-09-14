import { ApiProperty } from '@nestjs/swagger';
import { FractionalDpeClass, FractionalEsgEquipmentTier, FractionalEsgPhysicalRiskTier } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertEsgAssessmentDto {
  @ApiProperty({ enum: FractionalDpeClass, required: false })
  @IsOptional()
  @IsEnum(FractionalDpeClass)
  dpeClass?: FractionalDpeClass;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  consumptionKwhM2An?: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  decreeTertiaireSubject?: boolean;

  @ApiProperty({ enum: FractionalEsgEquipmentTier, required: false })
  @IsOptional()
  @IsEnum(FractionalEsgEquipmentTier)
  equipmentConditionTier?: FractionalEsgEquipmentTier;

  @ApiProperty({ enum: FractionalEsgPhysicalRiskTier, required: false })
  @IsOptional()
  @IsEnum(FractionalEsgPhysicalRiskTier)
  physicalRiskExposure?: FractionalEsgPhysicalRiskTier;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  greenLeaseClauses?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
