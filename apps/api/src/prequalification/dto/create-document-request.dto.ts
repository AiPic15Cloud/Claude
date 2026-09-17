import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const BLOCKS = [
  'identite',
  'travaux',
  'urbanisme',
  'division',
  'parcellaire',
  'commercialisation',
  'acquisition_conditionnelle',
  'revenus_locatifs',
  'autres_plateformes',
] as const;
const STATUSES = ['requested', 'received', 'expired', 'contradictory', 'not_usable'] as const;

export class CreateDocumentRequestDto {
  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty({ enum: BLOCKS })
  @IsIn(BLOCKS)
  block!: (typeof BLOCKS)[number];
}

export class UpdateDocumentRequestDto {
  @ApiProperty({ enum: STATUSES, required: false })
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  linkedDocumentId?: string;
}
