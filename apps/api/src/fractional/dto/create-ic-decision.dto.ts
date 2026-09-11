import { ApiProperty } from '@nestjs/swagger';
import { ICDecisionStatus } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateICDecisionDto {
  @ApiProperty({ enum: ICDecisionStatus })
  @IsEnum(ICDecisionStatus)
  status!: ICDecisionStatus;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  hardStops?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  conditions?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  watchItems?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  recommendation?: string;
}
