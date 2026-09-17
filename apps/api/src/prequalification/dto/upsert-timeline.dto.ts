import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpsertTimelineDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  businessUrgencyNote?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  realisticTimeline?: string;

  @ApiProperty({ required: false, description: '[{ label, note }]' })
  @IsOptional()
  @IsArray()
  dependencies?: Record<string, unknown>[];
}
