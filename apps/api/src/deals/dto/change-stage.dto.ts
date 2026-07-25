import { ApiProperty } from '@nestjs/swagger';
import { DealStage } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ChangeStageDto {
  @ApiProperty({ enum: DealStage })
  @IsEnum(DealStage)
  stage!: DealStage;
}
