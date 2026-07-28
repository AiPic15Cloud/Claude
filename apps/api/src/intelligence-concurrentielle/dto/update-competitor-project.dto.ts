import { PartialType } from '@nestjs/swagger';
import { CreateCompetitorProjectDto } from './create-competitor-project.dto';

export class UpdateCompetitorProjectDto extends PartialType(CreateCompetitorProjectDto) {}
