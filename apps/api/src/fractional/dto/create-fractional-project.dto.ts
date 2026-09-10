import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFractionalProjectDto {
  @ApiProperty()
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  reference!: string;

  @ApiProperty({ required: false, description: 'Regroupe les scénarios de périmètre d\'un même dossier physique (spec §22)' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  groupKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  perimeterLabel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  postcode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
