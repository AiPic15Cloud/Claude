import { ApiProperty } from '@nestjs/swagger';
import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTagDto {
  @ApiProperty()
  @IsString()
  @MaxLength(40)
  name!: string;

  @ApiProperty({ required: false, example: '#6366f1' })
  @IsOptional()
  @IsHexColor()
  color?: string;
}
