import { ApiProperty } from '@nestjs/swagger';
import { FindingCategory, FindingSeverity } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

/** Finding ajouté manuellement par un analyste — generatedBy: ANALYST est posé par le service, jamais par le client. */
export class CreateFindingDto {
  @ApiProperty({ enum: FindingCategory })
  @IsEnum(FindingCategory)
  category!: FindingCategory;

  @ApiProperty({ enum: FindingSeverity })
  @IsEnum(FindingSeverity)
  severity!: FindingSeverity;

  @ApiProperty()
  @IsString()
  statement!: string;

  @ApiProperty()
  @IsString()
  rationale!: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceIds?: string[];
}
