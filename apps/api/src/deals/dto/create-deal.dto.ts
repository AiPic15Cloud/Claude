import { ApiProperty } from '@nestjs/swagger';
import { DealType, DealRecoveryStatus } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDealDto {
  @ApiProperty()
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ enum: DealType })
  @IsEnum(DealType)
  type!: DealType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amountTarget!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountRaised?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  interestRate?: number;

  @ApiProperty({ required: false, description: 'Taux de fees (%) — le montant est toujours recalculé côté serveur' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  feesRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  durationMonths?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  postcode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsLatitude()
  lat?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsLongitude()
  lng?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false, description: 'Date min (échéance de vote)' })
  @IsOptional()
  @IsDateString()
  dateMin?: string;

  @ApiProperty({ required: false, description: 'Date cible (échéance de vote)' })
  @IsOptional()
  @IsDateString()
  dateCible?: string;

  @ApiProperty({ required: false, description: 'Date max (échéance de vote) — pilote les alertes J-90/J-60/J-30/J-15' })
  @IsOptional()
  @IsDateString()
  dateMax?: string;

  @ApiProperty({ required: false, description: 'Date de la dernière newsletter investisseurs envoyée' })
  @IsOptional()
  @IsDateString()
  lastNewsletterDate?: string;

  @ApiProperty({ required: false, description: 'Marque le projet comme entièrement remboursé — supprime les alertes d\'échéance' })
  @IsOptional()
  @IsBoolean()
  repaid?: boolean;

  @ApiProperty({
    enum: DealRecoveryStatus,
    required: false,
    description: 'Statut de recouvrement : Sain / En retard / Pré-contentieux / Procédure',
  })
  @IsOptional()
  @IsEnum(DealRecoveryStatus)
  recoveryStatus?: DealRecoveryStatus;

  @ApiProperty({ required: false, description: 'Cadence cible (jours) entre deux newsletters', default: 45 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  newsletterTargetDays?: number;

  @ApiProperty({ required: false, description: 'Nom du contact porteur de projet (relances, mise en demeure)' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  porteurNom?: string;

  @ApiProperty({ required: false, description: 'Société du porteur de projet' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  porteurSociete?: string;

  @ApiProperty({ required: false, description: 'Adresse postale du porteur de projet' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  porteurAdresse?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
