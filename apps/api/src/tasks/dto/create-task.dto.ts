import { ApiProperty } from '@nestjs/swagger';
import { Priority, TaskType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dealId?: string;

  @ApiProperty({ enum: Priority, required: false })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false, description: 'Defaults to the current user' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiProperty({ enum: TaskType, required: false, description: 'Defaults to AUTRE' })
  @IsOptional()
  @IsEnum(TaskType)
  typeTache?: TaskType;
}
