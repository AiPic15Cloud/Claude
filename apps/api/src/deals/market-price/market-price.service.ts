import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { resolveMarketSearchLocation } from './market-price-location.util';
import { fetchSitePrice } from './site-price-connector';
import { MARKET_PRICE_SITE_CONFIGS } from './market-price-sites.config';
import type { MarketPriceResult, MarketPriceTypology, SourcePriceResult } from './market-price.types';

/**
 * Recherche de prix au m² à la demande (spec ATLAS v2, C.8) — un appel
 * ponctuel sans état conservé entre deux utilisations, contrairement au
 * Market Intelligence Engine (C.1-C.7, collecte continue). Chaque source
 * est interrogée en parallèle et dégrade individuellement vers
 * "non disponible" en cas d'échec (Promise.allSettled) — jamais une source
 * qui bloque les autres, jamais une source silencieusement omise.
 */
@Injectable()
export class MarketPriceService {
  constructor(private readonly prisma: PrismaService) {}

  async search(organizationId: string, dealId: string, typology: MarketPriceTypology): Promise<MarketPriceResult> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId },
      select: { city: true, postcode: true },
    });
    if (!deal) throw new NotFoundException('Opération introuvable');

    const assumption = await this.prisma.financialAssumption.findUnique({
      where: { dealId },
      select: { sellingPricePerSqm: true },
    });

    const { query, arrondissementPostcode } = resolveMarketSearchLocation(deal.city, deal.postcode);

    const settled = await Promise.allSettled(
      MARKET_PRICE_SITE_CONFIGS.map((config) => fetchSitePrice(config, query, typology)),
    );
    const sources: SourcePriceResult[] = settled.map((result, i) =>
      result.status === 'fulfilled'
        ? result.value
        : {
            source: MARKET_PRICE_SITE_CONFIGS[i].source,
            available: false,
            priceLow: null,
            priceMid: null,
            priceHigh: null,
            error: (result.reason as Error)?.message ?? 'Erreur inattendue',
          },
    );

    const available = sources.filter((s) => s.available && s.priceLow !== null && s.priceMid !== null && s.priceHigh !== null);
    const averagePrices =
      available.length > 0
        ? {
            priceLow: Math.round(mean(available.map((s) => s.priceLow!))),
            priceMid: Math.round(mean(available.map((s) => s.priceMid!))),
            priceHigh: Math.round(mean(available.map((s) => s.priceHigh!))),
          }
        : null;

    return {
      query,
      arrondissementPostcode,
      typology,
      sources,
      average: averagePrices,
      exitPricePerSqm: assumption?.sellingPricePerSqm ? Number(assumption.sellingPricePerSqm) : null,
    };
  }
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
