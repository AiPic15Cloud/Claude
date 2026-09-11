import { ApiProperty } from '@nestjs/swagger';
import { StakeholderRole } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateStakeholderDto {
  @ApiProperty({ enum: StakeholderRole })
  @IsEnum(StakeholderRole)
  role!: StakeholderRole;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capitalEngaged?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
