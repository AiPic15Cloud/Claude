import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ReorderMilestonesDto {
  @ApiProperty({ type: [String], description: 'IDs des jalons de ce dossier, dans le nouvel ordre d\'affichage souhaité' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderedIds!: string[];
}
