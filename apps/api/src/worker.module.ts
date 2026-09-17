import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './common/config/configuration';
import { PrismaModule } from './common/prisma/prisma.module';
import { CrowdfundingWatchModule } from './crowdfunding-watch/crowdfunding-watch.module';
import { CrowdfundingWatchProcessorsModule } from './crowdfunding-watch/crowdfunding-watch-processors.module';

/**
 * Racine du second service Railway (spec Lot 1 §7 — "service de surveillance
 * persistant... pour assurer le suivi même lorsqu'Atlas n'est pas utilisé").
 * Volontairement minimal : pas de HTTP (NestFactory.createApplicationContext
 * dans worker.ts, aucun port lié), pas de ScheduleModule (les jobs internes
 * du worker — reconciliation du registre, sweep de reprise — sont des jobs
 * BullMQ répétables, pas des `@Cron`, enregistrés par
 * DetectionProcessor.onModuleInit). PrismaModule est global (voir
 * common/prisma/prisma.module.ts, @Global()) donc disponible ici sans import
 * explicite.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration] }), PrismaModule, CrowdfundingWatchModule, CrowdfundingWatchProcessorsModule],
})
export class WorkerModule {}
