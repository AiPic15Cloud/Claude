import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class UpdateAnchorDateDto {
  @ApiProperty({ description: 'Date réelle de publication BODACC (ou autre ancre légale), au format ISO 8601.' })
  @IsISO8601()
  anchorDate!: string;
}
