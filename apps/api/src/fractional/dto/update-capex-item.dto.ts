import { PartialType } from '@nestjs/swagger';
import { CreateCapexItemDto } from './create-capex-item.dto';

export class UpdateCapexItemDto extends PartialType(CreateCapexItemDto) {}
