import { PartialType } from '@nestjs/swagger';
import { UpsertGuaranteeDto } from './upsert-guarantee.dto';

export class UpdateGuaranteeDto extends PartialType(UpsertGuaranteeDto) {}
