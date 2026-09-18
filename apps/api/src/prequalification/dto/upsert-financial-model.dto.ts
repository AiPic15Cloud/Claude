import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CostLineItemDto {
  @ApiProperty()
  @IsString()
  category!: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty()
  @IsNumber()
  amount!: number;
}

export class UpsertFinancialModelDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountRequested?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredEquity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  provenEquity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  declaredMarginPct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredCoutDeRevient?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredChiffreAffaires?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  otherRevenueRetained?: number;

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

  // Honoraires techniques — 4 champs fixes
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  referralFees?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bankMiscFees?: number;

  // Financement ATLAS (équivalent "Modalités LPB")
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  interestRatePct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinMonths?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationTargetMonths?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMaxMonths?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  feesPctHT?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  tvaApplicable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tvaRatePct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  latePenaltyApplied?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  hypothequeEnvisagee?: boolean;

  @ApiProperty({ required: false, description: 'Montant décaissé chez le notaire à l\'acte (email de conditions, Trame Prequal).' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  montantDecaisseNotaire?: number;

  @ApiProperty({ required: false, description: 'Garanties envisagées, en texte libre.' })
  @IsOptional()
  @IsString()
  guaranteesNote?: string;

  // Financement bancaire optionnel
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

  // Covenants ICR/DSCR
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  resultatOperationnelEstime?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fluxTresorerieDisponibleEstime?: number;

  @ApiProperty({ required: false, type: [CostLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CostLineItemDto)
  costLineItems?: CostLineItemDto[];
}
