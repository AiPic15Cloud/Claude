import { ApiProperty } from '@nestjs/swagger';
import { FractionalScoreComparisonOperator } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ELIMINATORY_METRIC_LABELS } from '../eliminatory-rule.util';

const METRIC_KEYS = Object.keys(ELIMINATORY_METRIC_LABELS);

export class CreateEliminatoryRuleDto {
  @ApiProperty({ required: false, description: 'Typologie ciblée. Absent + platformProfileId absent = règle globale.' })
  @IsOptional()
  @IsString()
  assetType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  platformProfileId?: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty({ enum: METRIC_KEYS })
  @IsIn(METRIC_KEYS)
  metricKey!: string;

  @ApiProperty({ enum: FractionalScoreComparisonOperator })
  @IsEnum(FractionalScoreComparisonOperator)
  operator!: FractionalScoreComparisonOperator;

  @ApiProperty()
  @IsNumber()
  threshold!: number;

  @ApiProperty()
  @IsString()
  failMessage!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
