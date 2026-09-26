import { ApiProperty } from '@nestjs/swagger';
import { FractionalPlatformApplicationStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdatePlatformApplicationDto {
  @ApiProperty({ required: false, enum: FractionalPlatformApplicationStatus })
  @IsOptional()
  @IsEnum(FractionalPlatformApplicationStatus)
  status?: FractionalPlatformApplicationStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  firstContactDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  lastResponseDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;

  // Critères comparés à la date de comparaison — les critères non
  // communiqués par la plateforme restent "à confirmer" (spec §5.3), objet
  // libre plutôt qu'un schéma rigide tant que le référentiel plateforme
  // n'impose pas une forme fixe.
  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  comparedCriteria?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  offerSummary?: string;

  @ApiProperty({ required: false, description: 'Obligatoire en pratique quand status=REFUSEE (spec §5.4 : jamais "Refusé" sans dire qui).' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
