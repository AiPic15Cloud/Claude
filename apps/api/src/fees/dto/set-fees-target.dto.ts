import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Min } from 'class-validator';

export class SetFeesTargetDto {
  @ApiProperty()
  @IsInt()
  @Min(2000)
  year!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  targetAmount!: number;
}
