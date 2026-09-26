import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(OmitType(CreateTaskDto, ['milestoneId'] as const)) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @ApiProperty({ required: false, description: 'Bascule manuelle "en cours" pour la vue Kanban (F.1) — sans effet sur `done`.' })
  @IsOptional()
  @IsBoolean()
  inProgress?: boolean;

  // Redéclaré (PartialType rend le champ hérité optionnel, pas nullable) :
  // sans ça, il n'existe aucun moyen de détacher une tâche de son jalon une
  // fois rattachée, seulement d'en changer — `null` explicite retire le lien.
  @ApiProperty({ required: false, nullable: true, description: 'null pour détacher la tâche de son jalon' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  milestoneId?: string | null;
}
