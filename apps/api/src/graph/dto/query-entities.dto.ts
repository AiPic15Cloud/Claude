import { ApiProperty } from '@nestjs/swagger';
import { GraphEntityType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryEntitiesDto {
  @ApiProperty({ required: false, enum: GraphEntityType })
  @IsOptional()
  @IsEnum(GraphEntityType)
  type?: GraphEntityType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;
}
