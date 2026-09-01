import { ApiProperty } from '@nestjs/swagger';
import { EvidenceLevel } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class AddEvidenceDto {
  @ApiProperty({ enum: EvidenceLevel })
  @IsEnum(EvidenceLevel)
  level!: EvidenceLevel;

  @ApiProperty()
  @IsString()
  source!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
