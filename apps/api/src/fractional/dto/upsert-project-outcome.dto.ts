import { ApiProperty } from '@nestjs/swagger';
import { ProjectOutcomeStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

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
}
