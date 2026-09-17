import { ApiProperty } from '@nestjs/swagger';
import { FindingReviewStatus } from '@prisma/client';
import { IsEnum, IsIn } from 'class-validator';

const REVIEWABLE_STATUSES: FindingReviewStatus[] = ['ACCEPTED', 'REJECTED', 'AMENDED'];

export class ReviewFindingDto {
  @ApiProperty({ enum: REVIEWABLE_STATUSES })
  @IsEnum(FindingReviewStatus)
  @IsIn(REVIEWABLE_STATUSES)
  reviewStatus!: FindingReviewStatus;
}
