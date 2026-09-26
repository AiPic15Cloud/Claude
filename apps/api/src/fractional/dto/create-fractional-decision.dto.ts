import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Historique de décision (spec Cockpit/Fractionné P2 §6) — un vote humain
 * horodaté et motivé (poursuivre/suspendre/abandonner ou toute autre
 * décision de comité), distinct d'un verdict algorithmique (FractionalICDecision)
 * ou d'un changement mécanique de statut (FractionalStatusHistory).
 */
export class CreateFractionalDecisionDto {
  @ApiProperty({ description: 'Ex. "Poursuivre le dossier malgré le retard de collecte ?"' })
  @IsString()
  @MinLength(1)
  question!: string;

  @ApiProperty({ description: 'Ex. "Poursuivre", "Suspendre", "Abandonner"' })
  @IsString()
  @MinLength(1)
  choice!: string;

  @ApiProperty({ description: 'Jamais une décision sans motif (spec §5.4)' })
  @IsString()
  @MinLength(1)
  motif!: string;

  @ApiProperty({ required: false, description: 'Version du dossier au moment de la décision (traçabilité)' })
  @IsOptional()
  @IsInt()
  dossierVersion?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  sourcesConsultees?: string[];
}
