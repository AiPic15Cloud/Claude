import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

// Même vocabulaire de statut que PrequalDocumentRequest — mais pas de bloc
// fermé côté Deal : la spec ne définit pas de taxonomie de data room pour
// un dossier déjà en vie, `block` reste donc un texte libre et facultatif.
const STATUSES = ['requested', 'received', 'expired', 'contradictory', 'not_usable'] as const;

export class CreateDealDocumentRequestDto {
  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  block?: string;
}

export class UpdateDealDocumentRequestDto {
  @ApiProperty({ enum: STATUSES, required: false })
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  linkedDocumentId?: string;
}
