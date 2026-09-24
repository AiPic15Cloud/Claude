import { IsOptional, IsString } from 'class-validator';

/**
 * Contenu de la Note d'investissement — jamais persisté côté serveur
 * (édité librement par l'analyste en zone de texte, cf. investment-note-sheet.tsx).
 * L'export PDF doit donc rendre exactement ce que le client envoie, pas
 * recalculer/re-générer un texte différent.
 */
export class InvestmentNoteSectionsDto {
  @IsOptional()
  @IsString()
  resume?: string;

  @IsOptional()
  @IsString()
  presentation?: string;

  @IsOptional()
  @IsString()
  marche?: string;

  @IsOptional()
  @IsString()
  financier?: string;

  @IsOptional()
  @IsString()
  risque?: string;

  @IsOptional()
  @IsString()
  suivi?: string;
}
