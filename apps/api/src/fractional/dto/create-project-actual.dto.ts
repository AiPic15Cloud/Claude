import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProjectActualDto {
  @ApiProperty()
  @IsString()
  period!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  loyersReels?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  occupationPct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  opexReel?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  capexReel?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  distributionsReelles?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  valorisationReelle?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
