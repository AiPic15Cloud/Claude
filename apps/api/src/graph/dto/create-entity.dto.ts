import { ApiProperty } from '@nestjs/swagger';
import { GraphEntityType } from '@prisma/client';
import { IsEmail, IsEnum, IsLatitude, IsLongitude, IsObject, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

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

  @ApiProperty({ required: false, description: 'Person to contact (distinct from the organization name)' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  contactName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}
