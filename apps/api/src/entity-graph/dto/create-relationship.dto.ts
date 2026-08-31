import { ApiProperty } from '@nestjs/swagger';
import { EvidenceLevel } from '@prisma/client';
import { IsEnum, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateRelationshipDto {
  @ApiProperty()
  @IsString()
  sourceEntityId!: string;

  @ApiProperty()
  @IsString()
  targetEntityId!: string;

  @ApiProperty({ description: 'Clé de RelationshipType (ex. FINANCEUR, GROUPE_ECONOMIQUE).' })
  @IsString()
  typeKey!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  startedAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  percentage?: number;

  @ApiProperty({ required: false, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  criticality?: number;

  // Preuve initiale — une Relationship ne peut jamais exister sans au moins une Evidence (section 0.2).
  @ApiProperty({ enum: EvidenceLevel })
  @IsEnum(EvidenceLevel)
  evidenceLevel!: EvidenceLevel;

  @ApiProperty()
  @IsString()
  evidenceSource!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  evidenceReference?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  evidenceNote?: string;
}
