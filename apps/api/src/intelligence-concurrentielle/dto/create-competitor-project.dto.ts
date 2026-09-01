import { ApiProperty } from '@nestjs/swagger';
import { CompetitorProjectStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateCompetitorProjectDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: CompetitorProjectStatus, required: false })
  @IsOptional()
  @IsEnum(CompetitorProjectStatus)
  status?: CompetitorProjectStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
