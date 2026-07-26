import { ApiProperty } from '@nestjs/swagger';
import { CommitteeStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryPipelineDto {
  @ApiProperty({ required: false, enum: CommitteeStatus })
  @IsOptional()
  @IsEnum(CommitteeStatus)
  committee?: CommitteeStatus;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number = 50;
}
