import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class MarkPerteDefinitiveDto {
  @ApiProperty({ description: 'true pour acter une perte définitive, false pour la lever.' })
  @IsBoolean()
  flagged!: boolean;

  @ApiProperty({ required: false, description: 'Obligatoire quand flagged=true — justification de la décision (spec ATLAS v2, F.2).' })
  @IsOptional()
  @IsString()
  note?: string;
}
