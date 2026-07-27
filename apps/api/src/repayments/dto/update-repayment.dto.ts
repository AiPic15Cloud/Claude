import { PartialType } from '@nestjs/swagger';
import { CreateRepaymentDto } from './create-repayment.dto';

export class UpdateRepaymentDto extends PartialType(CreateRepaymentDto) {}
