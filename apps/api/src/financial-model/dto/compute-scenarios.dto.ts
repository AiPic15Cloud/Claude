import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { SensitivityAxisVariable } from '../scenario-sensitivity.util';

const AXIS_VARIABLES: SensitivityAxisVariable[] = [
  'tauxDeltaPts',
  'dureeDeltaMonths',
  'prixSortiePctDelta',
  'travauxPctDelta',
  'delaiCommercialisationMonths',
];

export class ScenarioDeltaDto {
  @ApiProperty({ required: false, description: 'Points de taux ajoutés/retranchés au taux LPB effectif actuel' })
  @IsOptional()
  @IsNumber()
  tauxDeltaPts?: number;

  @ApiProperty({ required: false, description: 'Mois ajoutés/retranchés à la durée cible actuelle' })
  @IsOptional()
  @IsNumber()
  dureeDeltaMonths?: number;

  @ApiProperty({ required: false, description: 'Variation en % du prix de vente actuel' })
  @IsOptional()
  @IsNumber()
  prixSortiePctDelta?: number;

  @ApiProperty({ required: false, description: 'Variation en % du total travaux actuel' })
  @IsOptional()
  @IsNumber()
  travauxPctDelta?: number;

  @ApiProperty({ required: false, description: 'Mois de retard de commercialisation au-delà de la durée cible ajustée' })
  @IsOptional()
  @IsNumber()
  delaiCommercialisationMonths?: number;
}

export class ComputeScenariosDto {
  @ApiProperty({ required: false, type: ScenarioDeltaDto, description: 'Scénario unique personnalisé (en plus des 3 scénarios prédéfinis, toujours calculés)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScenarioDeltaDto)
  custom?: ScenarioDeltaDto;

  @ApiProperty({ required: false, enum: AXIS_VARIABLES, description: 'Variable en ligne de la matrice de sensibilité croisée' })
  @IsOptional()
  @IsIn(AXIS_VARIABLES)
  matrixRowVariable?: SensitivityAxisVariable;

  @ApiProperty({ required: false, type: [Number], description: 'Valeurs de delta testées en ligne' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  matrixRowValues?: number[];

  @ApiProperty({ required: false, enum: AXIS_VARIABLES, description: 'Variable en colonne de la matrice de sensibilité croisée' })
  @IsOptional()
  @IsIn(AXIS_VARIABLES)
  matrixColVariable?: SensitivityAxisVariable;

  @ApiProperty({ required: false, type: [Number], description: 'Valeurs de delta testées en colonne' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  matrixColValues?: number[];
}
