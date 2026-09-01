import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const MARKET_PRICE_TYPOLOGIES = ['MAISON', 'APPARTEMENT', 'TERRAIN_A_BATIR'] as const;

export class MarketPriceQueryDto {
  @ApiProperty({ enum: MARKET_PRICE_TYPOLOGIES })
  @IsIn(MARKET_PRICE_TYPOLOGIES)
  typology!: (typeof MARKET_PRICE_TYPOLOGIES)[number];
}
