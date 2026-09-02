import { ApiProperty } from '@nestjs/swagger';
import { Priority, TaskType } from '@prisma/client';
import { IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator';

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
  @IsString()
  dueBefore?: string;

  @ApiProperty({ required: false, description: 'mine | all', default: 'mine' })
  @IsOptional()
  @IsString()
  scope?: 'mine' | 'all';

  @ApiProperty({ required: false, enum: TaskType })
  @IsOptional()
  @IsEnum(TaskType)
  typeTache?: TaskType;
}
