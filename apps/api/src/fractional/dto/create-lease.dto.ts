import { ApiProperty } from '@nestjs/swagger';
import { FractionalIndexationType, FractionalLeaseRenewalStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLeaseDto {
  @ApiProperty()
  @IsString()
  tenantName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lotLabel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  surfaceM2?: number;

  @ApiProperty()
  @IsDateString()
  dateEffet!: string;

  @ApiProperty()
  @IsDateString()
  dateTerme!: string;

  @ApiProperty({ required: false, type: [String], description: 'Dates de rupture (break options), ISO' })
  @IsOptional()
  @IsArray()
  breakDates?: string[];

  @ApiProperty()
  @IsNumber()
  @Min(0)
  loyerFacialAnnuel!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ervAnnuel?: number;

  @ApiProperty({ required: false, enum: FractionalIndexationType })
  @IsOptional()
  @IsEnum(FractionalIndexationType)
  indexation?: FractionalIndexationType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  franchiseMois?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  chargesRecuperables?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depotGarantieMontant?: number;

  @ApiProperty({ required: false, enum: FractionalLeaseRenewalStatus })
  @IsOptional()
  @IsEnum(FractionalLeaseRenewalStatus)
  statutRenouvellement?: FractionalLeaseRenewalStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  restrictionsCessionSousLocation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  repartitionTravaux?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  impayesNotes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sirenLocataire?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  procedureCollective?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  garantieMaisonMere?: boolean;

  @ApiProperty({ required: false, description: 'Bloc Financier — CA du dernier exercice connu du locataire' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  caLocataireAnnuel?: number;

  @ApiProperty({ required: false, description: 'Bloc Financier — EBITDA du dernier exercice connu du locataire' })
  @IsOptional()
  @IsNumber()
  ebitdaLocataireAnnuel?: number;

  @ApiProperty({ required: false, description: 'Bloc Financier — trésorerie disponible du locataire' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tresorerieLocataire?: number;

  @ApiProperty({ required: false, description: 'Date de clôture de l\'exercice financier renseigné' })
  @IsOptional()
  @IsDateString()
  exerciceFinancierAsOf?: string;
}
