import { PartialType } from '@nestjs/swagger';
import { CreateInterestPaymentDto } from './create-interest-payment.dto';

export class UpdateInterestPaymentDto extends PartialType(CreateInterestPaymentDto) {}
