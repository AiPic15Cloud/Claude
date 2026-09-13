import { ApiProperty } from '@nestjs/swagger';
import { FractionalProvenanceConfidence, FractionalProvenanceSourceLevel, FractionalProvenanceVerificationStatus } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpsertDataProvenanceDto {
  @ApiProperty({ enum: FractionalProvenanceSourceLevel })
  @IsEnum(FractionalProvenanceSourceLevel)
  sourceLevel!: FractionalProvenanceSourceLevel;

  @ApiProperty({ required: false, description: 'Document/page/cellule/URL — la preuve, pas juste "vu quelque part".' })
  @IsOptional()
  @IsString()
  sourceReference?: string;

  @ApiProperty({ required: false, description: 'Date économique de la donnée (distincte de la date de saisie dans Atlas).' })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @ApiProperty({ enum: FractionalProvenanceVerificationStatus })
  @IsEnum(FractionalProvenanceVerificationStatus)
  verificationStatus!: FractionalProvenanceVerificationStatus;

  @ApiProperty({ enum: FractionalProvenanceConfidence })
  @IsEnum(FractionalProvenanceConfidence)
  confidence!: FractionalProvenanceConfidence;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isOverride?: boolean;

  @ApiProperty({ required: false, description: 'Obligatoire si isOverride=true.' })
  @IsOptional()
  @IsString()
  overrideJustification?: string;
}
