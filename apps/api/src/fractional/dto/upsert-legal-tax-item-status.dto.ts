import { ApiProperty } from '@nestjs/swagger';
import { FractionalLegalTaxItemStatusValue } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpsertLegalTaxItemStatusDto {
  @ApiProperty({ enum: FractionalLegalTaxItemStatusValue })
  @IsEnum(FractionalLegalTaxItemStatusValue)
  status!: FractionalLegalTaxItemStatusValue;

  @ApiProperty({ required: false, description: 'Contexte — obligatoire en pratique pour RESERVE (quelle réserve, quel professionnel consulter).' })
  @IsOptional()
  @IsString()
  notes?: string;
}
