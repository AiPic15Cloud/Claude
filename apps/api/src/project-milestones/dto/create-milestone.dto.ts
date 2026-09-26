import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMilestoneDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  label!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  blocking?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  order?: number;
}
