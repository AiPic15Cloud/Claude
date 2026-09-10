import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePlatformProfileDto {
  @ApiProperty()
  @IsString()
  platformName!: string;

  @ApiProperty()
  @IsDateString()
  effectiveFrom!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  minNetInvestorYieldPct!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  targetHoldPeriodMonths?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  eligibleLocations?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  strategyConstraints?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  acquisitionFeePct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualManagementFeePct?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  incomeShareInvestorPct!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  capitalGainShareInvestorPct!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  appraisalRule?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  earlyExitRule?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  confidence?: string;
}
