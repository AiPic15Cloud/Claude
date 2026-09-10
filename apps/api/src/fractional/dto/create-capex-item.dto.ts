import { ApiProperty } from '@nestjs/swagger';
import { FractionalCapexResponsable } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCapexItemDto {
  @ApiProperty()
  @IsInt()
  annee!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  montant!: number;

  @ApiProperty()
  @IsString()
  nature!: string;

  @ApiProperty({ required: false, enum: FractionalCapexResponsable })
  @IsOptional()
  @IsEnum(FractionalCapexResponsable)
  responsable?: FractionalCapexResponsable;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
