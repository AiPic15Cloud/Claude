import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

// "Reporter" une action à faire (spec §4.1.3) — distinct de résoudre : la
// tâche reste ouverte, seule l'échéance change.
export class DeferActionItemDto {
  @ApiProperty()
  @IsDateString()
  dueAt!: string;
}
