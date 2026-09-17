import { ApiProperty } from '@nestjs/swagger';
import { PrequalCompanyRole, PrequalCompanyState } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpsertCompanyDto {
  @ApiProperty()
  @IsString()
  legalName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  siren?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  legalForm?: string;

  @ApiProperty({ enum: PrequalCompanyState, required: false })
  @IsOptional()
  @IsEnum(PrequalCompanyState)
  state?: PrequalCompanyState;

  @ApiProperty({ enum: PrequalCompanyRole })
  @IsEnum(PrequalCompanyRole)
  role!: PrequalCompanyRole;

  @ApiProperty({ required: false, description: '[{ name, role }]' })
  @IsOptional()
  @IsArray()
  executives?: Record<string, unknown>[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  accountsAvailable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  knownDebtNote?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  entityId?: string;
}
