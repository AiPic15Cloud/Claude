import { ApiProperty } from '@nestjs/swagger';
import { ArticleCategory } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateArticleDto {
  @ApiProperty()
  @IsString()
  sourceId!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  @ApiProperty({ enum: ArticleCategory, required: false })
  @IsOptional()
  @IsEnum(ArticleCategory)
  category?: ArticleCategory;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
