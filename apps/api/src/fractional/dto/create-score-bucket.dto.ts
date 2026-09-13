import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateScoreBucketDto {
  @ApiProperty()
  @IsString()
  criterionId!: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty()
  @IsNumber()
  points!: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isEliminatory?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
