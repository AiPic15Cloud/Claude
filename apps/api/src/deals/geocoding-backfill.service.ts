import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GeocodingService } from './geocoding.service';

const DELAY_BETWEEN_CALLS_MS = 400;

/**
 * Deals created before geocoding existed (e.g. the real-portfolio import)
 * never got coordinates, so they're invisible on Cartographie. Runs once
 * shortly after boot and fills in whatever it can from city/postcode —
 * fire-and-forget, never blocks startup or the health check.
 */
@Injectable()
export class GeocodingBackfillService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GeocodingBackfillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geocoding: GeocodingService,
  ) {}

  onApplicationBootstrap() {
    void this.run();
  }

  private async run() {
    const deals = await this.prisma.deal.findMany({
      where: { lat: null, lng: null, city: { not: null } },
      select: { id: true, address: true, city: true, postcode: true },
    });

    if (deals.length === 0) return;
    this.logger.log(`Géocodage de ${deals.length} opération(s) sans coordonnées...`);

    let updated = 0;
    for (const deal of deals) {
      const result = await this.geocoding.geocode(deal);
      if (result) {
        await this.prisma.deal.update({ where: { id: deal.id }, data: { lat: result.lat, lng: result.lng } });
        updated += 1;
      }
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_CALLS_MS));
    }
    this.logger.log(`Géocodage terminé : ${updated}/${deals.length} opération(s) localisée(s).`);
  }
}
