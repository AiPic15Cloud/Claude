import { ApiProperty } from '@nestjs/swagger';
import { DealStage, DealStatus, DealType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryDealsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: DealStage, isArray: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsEnum(DealStage, { each: true })
  stage?: DealStage[];

  @ApiProperty({ required: false, enum: DealType, isArray: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsEnum(DealType, { each: true })
  type?: DealType[];

  @ApiProperty({ required: false, enum: DealStatus })
  @IsOptional()
  @IsEnum(DealStatus)
  status?: DealStatus;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @ApiProperty({ required: false, description: 'Ne renvoie que les opérations dont la date max est dépassée' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  late?: boolean;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 50;

  @ApiProperty({ required: false, default: 'createdAt' })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'name', 'amountTarget', 'amountRaised', 'startDate'])
  sortBy?: string = 'createdAt';

  @ApiProperty({ required: false, default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
