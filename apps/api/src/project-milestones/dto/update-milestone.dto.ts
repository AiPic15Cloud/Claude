import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { MilestoneStatus } from '@prisma/client';
import { CreateMilestoneDto } from './create-milestone.dto';

const MILESTONE_STATUSES: MilestoneStatus[] = ['PENDING', 'IN_PROGRESS', 'AT_RISK', 'BLOCKED', 'DONE', 'WAIVED'];

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {
  @ApiProperty({ required: false, enum: MILESTONE_STATUSES })
  @IsOptional()
  @IsEnum(MILESTONE_STATUSES)
  status?: MilestoneStatus;
}
