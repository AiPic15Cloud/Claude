import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ReassignActionItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  ownerId!: string;
}
