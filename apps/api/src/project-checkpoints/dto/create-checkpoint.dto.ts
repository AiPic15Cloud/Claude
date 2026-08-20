import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateCheckpointDto {
  @IsOptional()
  @IsNumber()
  travauxBudgetInitial?: number;

  @IsOptional()
  @IsNumber()
  travauxDepensesADate?: number;

  @IsOptional()
  @IsBoolean()
  travauxTermines?: boolean;

  @IsOptional()
  @IsBoolean()
  commercialisationLancee?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  pourcentageVendu?: number;

  @IsOptional()
  @IsNumber()
  prixVenteInitialPrevu?: number;

  @IsOptional()
  @IsNumber()
  prixVenteActualise?: number;

  @IsOptional()
  @IsNumber()
  prixVenteReelADate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  atterrissagePrevu?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
