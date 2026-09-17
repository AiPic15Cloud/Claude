import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

/**
 * Second service Railway (spec Lot 1 §7) — contexte applicatif Nest sans
 * serveur HTTP : ce processus ne fait que consommer les files BullMQ
 * (détection/enrichissement/notification), il ne répond à aucune requête.
 * `createApplicationContext` instancie tout le graphe de providers (donc
 * tous les `@Processor`, qui démarrent leur worker BullMQ dans leur
 * constructeur) sans lier de port.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  // eslint-disable-next-line no-console
  console.log('Worker Veille crowdfunding démarré — files détection/enrichissement/notification actives.');

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`Worker Veille crowdfunding : arrêt (${signal}).`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap();
