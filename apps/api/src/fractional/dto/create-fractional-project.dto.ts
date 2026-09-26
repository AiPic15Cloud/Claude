import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFractionalProjectDto {
  @ApiProperty()
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  reference!: string;

  @ApiProperty({ required: false, description: 'Typologie libre (Commerce, Activités, Bureaux, Mixte...) — inconnue si absente, jamais devinée.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  assetType?: string;

  // ── Qualification courte (spec Cockpit/Fractionné P1 §5.2) — formulaire
  // une page, tout le reste explicitement "inconnu" si absent.
  @ApiProperty({ required: false, description: 'Canal d\'entrée de la piste (ex. apporteur, réseau, prospection directe).' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  entryChannel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  vendorContact?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  priceRangeMinEur?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  priceRangeMaxEur?: number;

  // ── Fiche de décision courte, générée à la sortie de la qualification —
  // thèse, 3 atouts et 3 risques maximum (spec §5.2 : "trois atouts maximum,
  // trois risques maximum").
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  qualificationThesis?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(3)
  qualificationStrengths?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(3)
  qualificationRisks?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualificationOpenQuestions?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nextActionLabel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nextActionOwnerId?: string;

  @ApiProperty({ required: false, description: 'Regroupe les scénarios de périmètre d\'un même dossier physique (spec §22)' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  groupKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  perimeterLabel?: string;

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
  @IsString()
  notes?: string;
}
