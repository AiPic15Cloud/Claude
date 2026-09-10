import { ApiProperty } from '@nestjs/swagger';
import { EntityDomain, EntityType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveCompanyDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ required: false, description: 'SIREN si connu — prime toujours sur une résolution par nom.' })
  @IsOptional()
  @IsString()
  siren?: string;

  @ApiProperty({ enum: EntityType })
  @IsEnum(EntityType)
  type!: EntityType;

  @ApiProperty({ enum: EntityDomain, required: false })
  @IsOptional()
  @IsEnum(EntityDomain)
  domain?: EntityDomain;

  @ApiProperty({ description: 'Traçabilité de la source de la donnée (ex. "market-observation:clubfunding", "deal:porteur").' })
  @IsString()
  @MaxLength(200)
  source!: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  createIfNoMatch?: boolean;
}
