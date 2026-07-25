import { ApiProperty } from '@nestjs/swagger';
import { GraphEntityType } from '@prisma/client';
import { IsEnum, IsLatitude, IsLongitude, IsObject, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateEntityDto {
  @ApiProperty({ enum: GraphEntityType })
  @IsEnum(GraphEntityType)
  type!: GraphEntityType;

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  website?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false, description: 'City-centroid latitude' })
  @IsOptional()
  @IsLatitude()
  lat?: number;

  @ApiProperty({ required: false, description: 'City-centroid longitude' })
  @IsOptional()
  @IsLongitude()
  lng?: number;

  @ApiProperty({ required: false, description: 'Type-specific attributes (e.g. category, foundedYear)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
