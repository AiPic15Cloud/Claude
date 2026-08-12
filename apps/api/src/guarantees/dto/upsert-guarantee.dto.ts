import { ApiProperty } from '@nestjs/swagger';
import { GuaranteeStatus, GuaranteeType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class UpsertGuaranteeDto {
  @ApiProperty({ enum: GuaranteeType })
  @IsEnum(GuaranteeType)
  type!: GuaranteeType;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  rank?: number;

  @ApiProperty({ enum: GuaranteeStatus, required: false })
  @IsOptional()
  @IsEnum(GuaranteeStatus)
  status?: GuaranteeStatus;

  @ApiProperty({
    required: false,
    description: 'Date de fin — pertinent pour hypothèque, fiducie et caution (pilote le statut Valide/Non valide et l’alerte de renouvellement à 6 mois)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
