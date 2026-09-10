import { ApiProperty } from '@nestjs/swagger';
import { FractionalVehicleInstrumentType } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertVehicleStructureDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  platformProfileId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  spvName?: string;

  @ApiProperty({ required: false, enum: FractionalVehicleInstrumentType })
  @IsOptional()
  @IsEnum(FractionalVehicleInstrumentType)
  instrumentType?: FractionalVehicleInstrumentType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  nominal?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  maturity?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  amortization?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  governanceNotes?: string;
}
