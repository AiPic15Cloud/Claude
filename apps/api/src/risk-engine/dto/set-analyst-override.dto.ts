import { ApiProperty } from '@nestjs/swagger';
import { DealSurveillanceStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SetAnalystOverrideDto {
  @ApiProperty({ enum: DealSurveillanceStatus })
  @IsEnum(DealSurveillanceStatus)
  overrideStatus!: DealSurveillanceStatus;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  justification!: string;
}
