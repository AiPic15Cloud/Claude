import { PartialType } from '@nestjs/swagger';
import { CreatePipelineEntryDto } from './create-pipeline-entry.dto';

export class UpdatePipelineEntryDto extends PartialType(CreatePipelineEntryDto) {}
