import { ApiProperty } from '@nestjs/swagger';
import { EvidenceStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class UpsertEvidenceDto {
  @ApiProperty({ enum: EvidenceStatus })
  @IsEnum(EvidenceStatus)
  status!: EvidenceStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sourceDocumentId?: string;

  @ApiProperty({ required: false, description: "Numéro de page auto-déclaré ou saisi par l'analyste — jamais une citation API vérifiée." })
  @IsOptional()
  @IsInt()
  @Min(1)
  sourcePage?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  confidence?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
