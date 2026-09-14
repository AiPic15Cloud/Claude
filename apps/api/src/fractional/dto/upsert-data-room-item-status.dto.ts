import { ApiProperty } from '@nestjs/swagger';
import { FractionalDataRoomItemStatusValue } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpsertDataRoomItemStatusDto {
  @ApiProperty({ enum: FractionalDataRoomItemStatusValue })
  @IsEnum(FractionalDataRoomItemStatusValue)
  status!: FractionalDataRoomItemStatusValue;

  @ApiProperty({ required: false, description: 'Contexte — obligatoire en pratique pour INCONSISTENT (quoi/pourquoi incohérent).' })
  @IsOptional()
  @IsString()
  notes?: string;
}
