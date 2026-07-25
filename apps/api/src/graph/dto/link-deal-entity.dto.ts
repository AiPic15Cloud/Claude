import { ApiProperty } from '@nestjs/swagger';
import { DealEntityRole } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class LinkDealEntityDto {
  @ApiProperty()
  @IsString()
  entityId!: string;

  @ApiProperty({ enum: DealEntityRole })
  @IsEnum(DealEntityRole)
  role!: DealEntityRole;
}
