import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

// Postes libres, en plus des champs fixes — l'utilisateur peut ajouter une
// ligne pour un frais non prévu par la structure fixe (Travaux, Honoraires
// techniques), sans migration à chaque nouveau besoin.
const COST_LINE_ITEM_CATEGORIES = ['TRAVAUX', 'HONORAIRES_TECHNIQUES'] as const;

export class CreateCostLineItemDto {
  @ApiProperty({ enum: COST_LINE_ITEM_CATEGORIES })
  @IsIn(COST_LINE_ITEM_CATEGORIES)
  category!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  label!: string;

  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateCostLineItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
