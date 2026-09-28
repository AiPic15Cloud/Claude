import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

// CTA libre — string validée ici (pas un enum Prisma), même convention que
// SaleLot.status/CostLineItem.category : le vocabulaire des actions est
// amené à s'étendre sans migration (spec Cockpit/Fractionné §4.1, CTA
// nommés dans les exemples : Qualifier, Vérifier le bail, Choisir une
// plateforme, Décider poursuivre/arrêter, Demander les pièces, Relancer,
// Valider reporting, Traiter impayé, Renouvellement, Travaux).
export const ACTION_ITEM_TYPES = [
  'QUALIFIER',
  'VERIFIER_DONNEE',
  'CHOISIR_PLATEFORME',
  'DECIDER_POURSUIVRE_ABANDONNER',
  'DEMANDER_PIECES',
  'RELANCER',
  'VALIDER_REPORTING',
  'TRAITER_IMPAYE',
  'RENOUVELLEMENT',
  'TRAVAUX',
  'EXAMINER_COVENANT',
  'LEVER_BLOCAGE',
  'AUTRE',
] as const;

// CTA affiché sur la carte cockpit (spec §4.1.2 : "CTA spécifique") — clé
// par défaut 'Traiter' pour un actionType hors de ce référentiel.
export const ACTION_TYPE_CTA_LABELS: Record<string, string> = {
  QUALIFIER: 'Qualifier',
  VERIFIER_DONNEE: 'Vérifier',
  CHOISIR_PLATEFORME: 'Choisir une plateforme',
  DECIDER_POURSUIVRE_ABANDONNER: 'Décider poursuivre/arrêter',
  DEMANDER_PIECES: 'Demander les pièces',
  RELANCER: 'Relancer',
  VALIDER_REPORTING: 'Valider le reporting',
  TRAITER_IMPAYE: 'Traiter l\'impayé',
  RENOUVELLEMENT: 'Traiter le renouvellement',
  TRAVAUX: 'Suivre les travaux',
  EXAMINER_COVENANT: 'Examiner le covenant',
  LEVER_BLOCAGE: 'Lever le blocage',
  AUTRE: 'Traiter',
};

export class CreateActionItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dealId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fractionalProjectId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  cause!: string;

  @ApiProperty({ enum: ACTION_ITEM_TYPES })
  @IsIn(ACTION_ITEM_TYPES)
  actionType!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  label!: string;

  @ApiProperty()
  @IsString()
  ownerId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  blocking?: boolean;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  deepLink!: string;
}
