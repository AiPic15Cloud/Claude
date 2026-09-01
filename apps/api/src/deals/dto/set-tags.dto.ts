import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class SetTagsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  tagIds!: string[];
}
