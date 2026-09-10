import { ApiProperty, PartialType } from '@nestjs/swagger';
import { FractionalProjectStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateFractionalProjectDto } from './create-fractional-project.dto';

export class UpdateFractionalProjectDto extends PartialType(CreateFractionalProjectDto) {
  @ApiProperty({ required: false, enum: FractionalProjectStatus })
  @IsOptional()
  @IsEnum(FractionalProjectStatus)
  status?: FractionalProjectStatus;
}
