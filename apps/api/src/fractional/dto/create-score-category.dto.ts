import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateScoreCategoryDto {
  @ApiProperty({ required: false, description: 'Typologie ciblée (ex. "Commerce"). Absent = barème générique.' })
  @IsOptional()
  @IsString()
  assetType?: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty()
  @IsNumber()
  maxPoints!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
