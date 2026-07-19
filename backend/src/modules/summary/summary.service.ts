import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GeminiService } from '../ai/gemini.service';
import { MemorySynchronizer } from '../memory/memory-synchronizer.service';
import { MemoryLogger } from '../memory/memory-logger.service';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: GeminiService,
    private readonly memorySynchronizer: MemorySynchronizer,
    private readonly memoryLogger: MemoryLogger,
  ) {}

  private async getInternalUserId(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  async generateSummary(clerkId: string, type: 'PATIENT' | 'DOCTOR') {
    const userId = await this.getInternalUserId(clerkId);
    
    // Fetch all extractions for this user
    const extractions = await this.prisma.extraction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20 // limit to recent extractions
    });

    if (extractions.length === 0) {
      const defaultSummary = {
        currentConditions: [],
        currentMedicines: [],
        allergies: [],
        recentLabs: [],
        recentImaging: [],
        pastSurgeries: [],
        vitalSigns: [],
        immunizations: [],
        summary: "No medical documents provided yet. Please upload clinical documents or prescriptions to generate insights."
      };
      return defaultSummary;
    }

    const structuredSummary = await this.aiService.summarizePatientHistory(extractions, type, userId);

    const summaryAny = structuredSummary as Record<string, unknown>;
    if (type === 'DOCTOR' && structuredSummary) {
      try {
        await this.prisma.doctorSummary.create({
          data: {
            userId,
            currentConditions: Array.isArray(summaryAny.currentConditions) ? summaryAny.currentConditions : [],
            currentMedicines: summaryAny.currentMedicines || [],
            allergies: summaryAny.allergies || [],
            recentLabs: summaryAny.recentLabs || [],
            recentImaging: summaryAny.recentImaging || [],
            pastSurgeries: summaryAny.pastSurgeries || [],
            vitalSigns: summaryAny.vitalSigns || [],
            immunizations: summaryAny.immunizations || [],
            aiModel: 'gemini-1.5-pro',
            confidence: 0.95,
          }
        });
      } catch (_e) {
        this.logger.warn('Failed to persist DoctorSummary', _e);
      }
    }

    // Store summary in memory (fire-and-forget)
    this.memorySynchronizer.onSummaryGenerated(userId, structuredSummary);
    this.memoryLogger.debug('SUMMARY_MEMORY_SYNC_TRIGGERED');

    return structuredSummary;
  }
}
