import { ApiProperty } from '@nestjs/swagger';
import { FractionalValuationMethod } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateValuationDto {
  @ApiProperty({ enum: FractionalValuationMethod })
  @IsEnum(FractionalValuationMethod)
  method!: FractionalValuationMethod;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  capRatePct?: number;

  @ApiProperty()
  @IsDateString()
  asOfDate!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
