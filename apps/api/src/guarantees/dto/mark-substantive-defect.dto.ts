import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class MarkSubstantiveDefectDto {
  @ApiProperty({ description: 'true pour signaler un défaut de fond, false pour le lever.' })
  @IsBoolean()
  flagged!: boolean;

  @ApiProperty({ required: false, description: 'Obligatoire quand flagged=true.' })
  @IsOptional()
  @IsString()
  note?: string;
}
