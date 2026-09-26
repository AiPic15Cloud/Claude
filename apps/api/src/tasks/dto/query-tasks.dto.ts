import { ApiProperty } from '@nestjs/swagger';
import { Priority, TaskType } from '@prisma/client';
import { IsBooleanString, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryTasksDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBooleanString()
  done?: string;

  @ApiProperty({ required: false, enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiProperty({ required: false, description: 'ISO date — tasks due on or before this date' })
  @IsOptional()
  @IsDateString()
  dueBefore?: string;

  @ApiProperty({ required: false, description: 'mine | all', default: 'mine' })
  @IsOptional()
  @IsString()
  scope?: 'mine' | 'all';

  @ApiProperty({ required: false, enum: TaskType })
  @IsOptional()
  @IsEnum(TaskType)
  typeTache?: TaskType;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number = 200;
}
