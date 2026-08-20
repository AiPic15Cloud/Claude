import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  sold?: boolean;

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  sold?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
