import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class UpsertFinancialAssumptionDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  surfaceSqm!: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  sellingPricePerSqm!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  targetMarginPct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  // Foncier
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  landPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  notaryFees?: number;

  // Honoraires techniques
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  diagnosticsCost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceCost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  propertyTaxCost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  surveyStudiesCost?: number;

  // Autres frais
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  agencyFees?: number;

  @ApiProperty({ required: false, description: "Commission d'apporteur d'affaires — distincte des honoraires d'agence" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  referralFees?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bankMiscFees?: number;

  // Financement LPB
  @ApiProperty({ required: false, description: '% fees HT sur la collecte' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lpbFeesPctHT?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  lpbTvaApplicable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lpbTvaRatePct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  lpbDurationMinMonths?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  lpbDurationMaxMonths?: number;

  @ApiProperty({ required: false, description: 'Simulation "et si le projet est en retard" — +5 points sur le taux LPB utilisé pour les intérêts.' })
  @IsOptional()
  @IsBoolean()
  latePenaltyApplied?: boolean;

  // Financement bancaire (optionnel)
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bankLoanAcquisition?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bankLoanAccompagnement?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bankInterestRatePct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bankFileFees?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bankGuaranteeFees?: number;

  @ApiProperty({ required: false, description: "Document du dossier qui justifie ces valeurs (ex. un business plan analysé par l'IA)" })
  @IsOptional()
  @IsString()
  sourceDocumentId?: string;

  // Covenants ICR/DSCR (spec ATLAS v2, module MARKO F.3) — saisie manuelle,
  // pertinence à juger au cas par cas (cf. covenant.util.ts).
  @ApiProperty({ required: false, description: 'Résultat opérationnel estimé — numérateur ICR.' })
  @IsOptional()
  @IsNumber()
  resultatOperationnelEstime?: number;

  @ApiProperty({ required: false, description: 'Flux de trésorerie disponible estimé — numérateur DSCR.' })
  @IsOptional()
  @IsNumber()
  fluxTresorerieDisponibleEstime?: number;
}
