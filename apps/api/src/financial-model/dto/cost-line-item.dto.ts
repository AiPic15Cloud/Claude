import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

// 'TRAVAUX' est la seule catégorie câblée dans l'UI pour l'instant — le champ
// existe pour permettre l'extension à d'autres postes plus tard sans migration.
const COST_LINE_ITEM_CATEGORIES = ['TRAVAUX'] as const;

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
