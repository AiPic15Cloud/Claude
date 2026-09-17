import { ApiProperty } from '@nestjs/swagger';
import { PrequalificationOrientation } from '@prisma/client';
import { IsEnum, IsInt, IsString, Min } from 'class-validator';

/** Correspond à ValidatePrequalificationCommand (spec §16.1). */
export class ValidateCaseDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiProperty({ enum: PrequalificationOrientation })
  @IsEnum(PrequalificationOrientation)
  orientation!: PrequalificationOrientation;

  @ApiProperty()
  @IsString()
  decisionComment!: string;
}
