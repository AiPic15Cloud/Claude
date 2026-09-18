import { ApiProperty } from '@nestjs/swagger';
import { PrequalificationProjectType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCaseDto {
  @ApiProperty()
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  entryChannel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  introducer?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assignedAnalystId?: string;

  @ApiProperty({ enum: PrequalificationProjectType, required: false })
  @IsOptional()
  @IsEnum(PrequalificationProjectType)
  projectType?: PrequalificationProjectType;

  @ApiProperty({ required: false, description: 'Ressenti qualitatif du chargé d\'affaires sur le projet (Trame Prequal §6).' })
  @IsOptional()
  @IsString()
  analystImpressionNote?: string;
}
