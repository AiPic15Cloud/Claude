import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class UpsertFinancialAssumptionDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  surfaceSqm!: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  constructionCostPerSqm!: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  sellingPricePerSqm!: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  otherCosts?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  targetMarginPct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, description: "Document du dossier qui justifie ces valeurs (ex. un business plan analysé par l'IA)" })
  @IsOptional()
  @IsString()
  sourceDocumentId?: string;
}
