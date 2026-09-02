import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @ApiProperty({ required: false, description: 'Bascule manuelle "en cours" pour la vue Kanban (F.1) — sans effet sur `done`.' })
  @IsOptional()
  @IsBoolean()
  inProgress?: boolean;
}
