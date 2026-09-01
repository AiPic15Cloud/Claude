import { ApiProperty } from '@nestjs/swagger';
import { CommitteeStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePipelineEntryDto {
  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  operator!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  typology?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  margin?: number;

  @ApiProperty({ required: false, description: "Taux de fees ATLAS (%) négocié sur ce dossier — alimente la projection pipeline" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  feesRate?: number;

  @ApiProperty({ required: false, enum: CommitteeStatus, default: 'PAS_DE_COMITE' })
  @IsOptional()
  @IsEnum(CommitteeStatus)
  committee?: CommitteeStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  decision?: string;
}
