import { ApiProperty } from '@nestjs/swagger';
import { ProjectOutcomeStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertProjectOutcomeDto {
  @ApiProperty({ enum: ProjectOutcomeStatus })
  @IsEnum(ProjectOutcomeStatus)
  status!: ProjectOutcomeStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  triRealise?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  multipleRealise?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  /** Date de sortie réelle — exigée par le service (garde-fou project.status === SORTIE). */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  exitDate?: string;
}
