import { Module } from '@nestjs/common';
import { CrowdfundingWatchModule } from './crowdfunding-watch.module';
import { AlertsModule } from '../alerts/alerts.module';
import { DetectionProcessor } from './detection.processor';
import { EnrichmentProcessor } from './enrichment.processor';
import { NotificationProcessor } from './notification.processor';

/**
 * Importé UNIQUEMENT par WorkerModule (apps/api/src/worker.module.ts) —
 * jamais par AppModule. C'est ce découpage, pas seulement l'existence d'un
 * second point d'entrée (worker.ts), qui garantit que le processus web ne
 * consomme jamais de job BullMQ (spec Lot 1 §7).
 */
@Module({
  imports: [CrowdfundingWatchModule, AlertsModule],
  providers: [DetectionProcessor, EnrichmentProcessor, NotificationProcessor],
})
export class CrowdfundingWatchProcessorsModule {}
