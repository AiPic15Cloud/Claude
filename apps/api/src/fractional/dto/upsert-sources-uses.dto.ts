import { ApiProperty } from '@nestjs/swagger';
import { FractionalTvaRegime } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpsertSourcesUsesDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  prixNetVendeur!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  droitsNotaire?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  honoraires?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  travauxInitiaux?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capexDiffereReserve?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fraisPlateformeEntree?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reserveVacance?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reserveTravaux?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reserveTresorerie?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  collecteMontant?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sponsorEquity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  detteEventuelle?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  autresSources?: number;

  @ApiProperty({ enum: FractionalTvaRegime, required: false, default: 'NON_ASSUJETTI' })
  @IsOptional()
  @IsEnum(FractionalTvaRegime)
  regimeTva?: FractionalTvaRegime;

  @ApiProperty({ required: false, description: 'Taux de TVA applicable (%) — 20 par défaut si non renseigné.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tvaTauxPct?: number;

  @ApiProperty({ required: false, description: 'Délai de récupération de la TVA en mois (ex. 3 en régime réel normal, 14 en régime réel simplifié).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  tvaRecuperationDelaiMois?: number;
}
