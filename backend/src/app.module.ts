import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';

import { PrismaModule } from "./modules/database/prisma.module";
import { HealthModule } from "./modules/health/health.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { AiModule } from "./modules/ai/ai.module";
import { TimelineModule } from "./modules/timeline/timeline.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ClerkAuthGuard } from "./common/guards/clerk-auth.guard";
import { OcrModule } from './modules/ocr/ocr.module';
import { MedicationsModule } from './modules/medications/medications.module';
import { LabsModule } from './modules/labs/labs.module';
import { SummaryModule } from './modules/summary/summary.module';
import { SearchModule } from './modules/search/search.module';
import { FamilyModule } from './modules/family/family.module';
import { SharingModule } from './modules/sharing/sharing.module';
import { FhirModule } from './modules/fhir/fhir.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MemoryModule } from './modules/memory/memory.module';
import { AIContextModule } from './modules/ai-context/ai-context.module';
import { VoiceModule } from './modules/voice/voice.module';

@Module({
  imports: [
    // ─── Global Configuration ───
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local"],
    }),

    // ─── Rate Limiting ───
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000,
        limit: 10, // 10 requests per second
      },
      {
        name: "medium",
        ttl: 60000,
        limit: 100, // 100 requests per minute
      },
    ]),

    // ─── Queue (BullMQ / Redis) ───
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          return {
            connection: new Redis(redisUrl, { maxRetriesPerRequest: null }) as unknown as Record<string, unknown>
          };
        }
        return {
          connection: {
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
          }
        };
      },
    }),

    // ─── Database ───
    PrismaModule,

    // ─── Memory & AI Context (Global) ───
    MemoryModule,
    AIContextModule,

    // ─── Feature Modules ───
    HealthModule,
    DocumentsModule,
    AiModule,
    TimelineModule,
    AuthModule,
    OcrModule,
    MedicationsModule,
    LabsModule,
    SummaryModule,
    SearchModule,
    FamilyModule,
    SharingModule,
    FhirModule,
    DashboardModule,
    VoiceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
  ],
})
export class AppModule {}
