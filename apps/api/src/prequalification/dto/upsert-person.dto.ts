import { ApiProperty } from '@nestjs/swagger';
import { PrequalPersonRole } from '@prisma/client';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertPersonDto {
  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiProperty({ enum: PrequalPersonRole })
  @IsEnum(PrequalPersonRole)
  role!: PrequalPersonRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cv?: string;

  @ApiProperty({ required: false, description: '[{ date, typology, amount, marginPct, outcome, actualRole }]' })
  @IsOptional()
  @IsArray()
  trackRecord?: Record<string, unknown>[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredNetWorth?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  availableEquity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  equityProofNote?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ongoingDealsNote?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  incidentsNote?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  entityId?: string;
}
