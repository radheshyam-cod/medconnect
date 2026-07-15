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
      const summaryResult = { summary: "No medical records found to summarize." };
      return summaryResult;
    }

    const structuredSummary = await this.aiService.summarizePatientHistory(extractions, type, userId);

    // Store summary in memory (fire-and-forget)
    this.memorySynchronizer.onSummaryGenerated(userId, structuredSummary);
    this.memoryLogger.debug('SUMMARY_MEMORY_SYNC_TRIGGERED');

    return structuredSummary;
  }
}
