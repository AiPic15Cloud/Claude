import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import configuration from './common/config/configuration';
import { PrismaModule } from './common/prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { DealsModule } from './deals/deals.module';
import { TagsModule } from './tags/tags.module';
import { NotesModule } from './notes/notes.module';
import { TasksModule } from './tasks/tasks.module';
import { DocumentsModule } from './documents/documents.module';
import { ActivitiesModule } from './activities/activities.module';
import { AlertsModule } from './alerts/alerts.module';
import { CockpitModule } from './cockpit/cockpit.module';
import { GuaranteesModule } from './guarantees/guarantees.module';
import { FinancialModelModule } from './financial-model/financial-model.module';
import { ScoringModule } from './scoring/scoring.module';
import { GraphModule } from './graph/graph.module';
import { IntelligenceConcurrentielleModule } from './intelligence-concurrentielle/intelligence-concurrentielle.module';
import { IntelligenceMarcheModule } from './intelligence-marche/intelligence-marche.module';
import { AgentsModule } from './agents/agents.module';
import { SearchModule } from './search/search.module';
import { MarketTickerModule } from './market-ticker/market-ticker.module';
import { FeesModule } from './fees/fees.module';
import { RepaymentsModule } from './repayments/repayments.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('redis.url'),
          // Required by BullMQ workers — without this, a slow/unreachable
          // Redis can make blocking commands error out instead of waiting,
          // which otherwise surfaces as confusing startup instability.
          maxRetriesPerRequest: null,
        },
      }),
    }),
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    DealsModule,
    TagsModule,
    NotesModule,
    TasksModule,
    DocumentsModule,
    ActivitiesModule,
    AlertsModule,
    CockpitModule,
    GuaranteesModule,
    FinancialModelModule,
    ScoringModule,
    GraphModule,
    IntelligenceConcurrentielleModule,
    IntelligenceMarcheModule,
    AgentsModule,
    SearchModule,
    MarketTickerModule,
    FeesModule,
    RepaymentsModule,
    PipelineModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }],
})
export class AppModule {}
