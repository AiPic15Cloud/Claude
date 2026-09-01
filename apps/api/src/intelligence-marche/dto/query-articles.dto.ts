import { ApiProperty } from '@nestjs/swagger';
import { ArticleCategory } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryArticlesDto {
  @ApiProperty({ required: false, enum: ArticleCategory })
  @IsOptional()
  @IsEnum(ArticleCategory)
  category?: ArticleCategory;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 30;
}
