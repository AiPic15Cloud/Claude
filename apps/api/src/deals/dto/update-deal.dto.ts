import { ApiProperty, PartialType } from '@nestjs/swagger';
import { DealStage, DealStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateDealDto } from './create-deal.dto';

export class UpdateDealDto extends PartialType(CreateDealDto) {
  @ApiProperty({ enum: DealStage, required: false })
  @IsOptional()
  @IsEnum(DealStage)
  stage?: DealStage;

  @ApiProperty({ enum: DealStatus, required: false })
  @IsOptional()
  @IsEnum(DealStatus)
  status?: DealStatus;
}
