import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

// Jamais présumé — la définition de la cible (spec §10 Q3) reste "non
// définie" tant que les associés ne l'ont pas arbitrée.
export const STRUCTURE_TARGET_BASES = ['CA_STRUCTURE', 'RESULTAT_STRUCTURE', 'REVENU_PERSONNEL'] as const;

export class UpsertStructureTargetDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  targetAmountEur?: number;

  @ApiProperty({ required: false, enum: STRUCTURE_TARGET_BASES })
  @IsOptional()
  @IsIn(STRUCTURE_TARGET_BASES)
  targetBasis?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
