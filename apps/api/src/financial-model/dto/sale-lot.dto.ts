import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

// Statut de commercialisation du lot — string libre (pas un enum Prisma),
// même convention que CostLineItem.category : validé ici, pas de migration
// nécessaire si un statut s'ajoute plus tard.
export const SALE_LOT_STATUSES = ['OFFRE', 'PROMESSE_COMPROMIS', 'RESERVATION', 'VENDU'] as const;

export class CreateSaleLotDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  label!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  surfaceSqm!: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  salePrice!: number;

  @ApiProperty({ required: false, enum: SALE_LOT_STATUSES })
  @IsOptional()
  @IsIn(SALE_LOT_STATUSES)
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateSaleLotDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  surfaceSqm?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  salePrice?: number;

  @ApiProperty({ required: false, enum: SALE_LOT_STATUSES })
  @IsOptional()
  @IsIn(SALE_LOT_STATUSES)
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
