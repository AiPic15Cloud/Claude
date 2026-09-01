import { ApiProperty } from '@nestjs/swagger';
import { GraphRelationType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateRelationDto {
  @ApiProperty()
  @IsString()
  fromEntityId!: string;

  @ApiProperty()
  @IsString()
  toEntityId!: string;

  @ApiProperty({ enum: GraphRelationType })
  @IsEnum(GraphRelationType)
  type!: GraphRelationType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  label?: string;
}
