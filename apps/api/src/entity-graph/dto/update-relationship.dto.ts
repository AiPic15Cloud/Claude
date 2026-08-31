import { ApiProperty } from '@nestjs/swagger';
import { RelationshipCoverage, RelationshipStatus } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateRelationshipDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  percentage?: number;

  @ApiProperty({ required: false, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  criticality?: number;

  @ApiProperty({ required: false, enum: RelationshipStatus })
  @IsOptional()
  @IsEnum(RelationshipStatus)
  status?: RelationshipStatus;

  @ApiProperty({ required: false, enum: RelationshipCoverage })
  @IsOptional()
  @IsEnum(RelationshipCoverage)
  confidence?: RelationshipCoverage;
}
