import { PartialType } from '@nestjs/swagger';
import { CreateWaterfallTierDto } from './create-waterfall-tier.dto';

export class UpdateWaterfallTierDto extends PartialType(CreateWaterfallTierDto) {}
