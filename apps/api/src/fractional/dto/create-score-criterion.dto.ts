import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateScoreCriterionDto {
  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty({ required: false, description: 'Champ indicatif du moteur que ce critère recoupe — jamais recalculé automatiquement (v1).' })
  @IsOptional()
  @IsString()
  sourceField?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
