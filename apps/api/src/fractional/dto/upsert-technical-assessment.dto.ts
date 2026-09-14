import { ApiProperty } from '@nestjs/swagger';
import { FractionalTechnicalTier } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpsertTechnicalAssessmentDto {
  @ApiProperty({ enum: FractionalTechnicalTier })
  @IsEnum(FractionalTechnicalTier)
  tier!: FractionalTechnicalTier;

  @ApiProperty({ required: false, default: false, description: 'Condition préalable à lever avant acquisition.' })
  @IsOptional()
  @IsBoolean()
  conditionPrealable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
