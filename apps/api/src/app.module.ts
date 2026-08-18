import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './common/config/configuration';
import { PrismaModule } from './common/prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SanitizeBodyInterceptor } from './common/interceptors/sanitize-body.interceptor';
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
import { ProjectCheckpointsModule } from './project-checkpoints/project-checkpoints.module';
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
import { PushModule } from './push/push.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    // Default budget for every route; auth endpoints layer a much tighter
    // per-route @Throttle on top (see AuthController) since they're the
    // realistic brute-force targets (login, 2FA codes, account creation).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
    ProjectCheckpointsModule,
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
    PushModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: SanitizeBodyInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
