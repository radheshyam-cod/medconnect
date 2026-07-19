import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { GeminiService } from "../ai/gemini.service";
import { CreateTimelineEventDto } from "./dto/create-timeline-event.dto";
import { QueryTimelineDto } from "./dto/query-timeline.dto";
import { TimelineEventDto, TimelineSummaryDto } from "./dto/timeline-response.dto";
import { AITimelineSummaryDto } from "./dto/ai-summary-response.dto";
import { Prisma, TimelineSource } from "@prisma/client";
import { MemorySynchronizer } from '../memory/memory-synchronizer.service';
import { MemoryLogger } from '../memory/memory-logger.service';
import { FamilyService } from '../family/family.service';
import { ForbiddenException } from '@nestjs/common';

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: GeminiService,
    private readonly memorySynchronizer: MemorySynchronizer,
    private readonly memoryLogger: MemoryLogger,
    private readonly familyService: FamilyService,
  ) {}

  private async getInternalUserId(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  /**
   * Get paginated timeline events for a user with optional filters.
   */
  async findAll(
    clerkId: string,
    queryParams: QueryTimelineDto,
  ): Promise<{ events: TimelineEventDto[]; total: number }> {
    const userId = await this.getInternalUserId(clerkId);
    let targetUserId = userId;

    if (queryParams.patientId && queryParams.patientId !== userId) {
      const hasAccess = await this.familyService.verifyAccess(userId, queryParams.patientId);
      if (!hasAccess) throw new ForbiddenException('You do not have access to this patient\'s records');
      targetUserId = queryParams.patientId;
    }

    const where: Prisma.TimelineWhereInput = { userId: targetUserId };

    if (queryParams.eventType) {
      where.eventType = queryParams.eventType;
    }

    if (queryParams.search) {
      where.OR = [
        { title: { contains: queryParams.search, mode: "insensitive" } },
        { description: { contains: queryParams.search, mode: "insensitive" } },
      ];
    }

    if (queryParams.from || queryParams.to) {
      where.eventDate = {};
      if (queryParams.from) where.eventDate.gte = new Date(queryParams.from);
      if (queryParams.to) where.eventDate.lte = new Date(queryParams.to);
    }

    const page = queryParams.page || 1;
    const limit = queryParams.limit || 20;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.prisma.timeline.findMany({
        where,
        orderBy: { eventDate: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.timeline.count({ where }),
    ]);

    return {
      events: events.map((e) => TimelineEventDto.fromPrisma(e)),
      total,
    };
  }

  /**
   * Get a single timeline event.
   */
  async findOne(clerkId: string, id: string, patientId?: string): Promise<TimelineEventDto> {
    const userId = await this.getInternalUserId(clerkId);
    let targetUserId = userId;

    if (patientId && patientId !== userId) {
      const hasAccess = await this.familyService.verifyAccess(userId, patientId);
      if (!hasAccess) throw new ForbiddenException('You do not have access to this patient\'s records');
      targetUserId = patientId;
    }

    const event = await this.prisma.timeline.findFirst({
      where: { id, userId: targetUserId },
    });

    if (!event) {
      throw new NotFoundException("Timeline event not found");
    }

    return TimelineEventDto.fromPrisma(event);
  }

  /**
   * Create a manual timeline event and sync to memory.
   */
  async create(
    clerkId: string,
    dto: CreateTimelineEventDto,
  ): Promise<TimelineEventDto> {
    const userId = await this.getInternalUserId(clerkId);
    const event = await this.prisma.timeline.create({
      data: {
        userId,
        eventType: dto.eventType,
        eventDate: new Date(dto.eventDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        title: dto.title,
        description: dto.description || null,
        severity: dto.severity || null,
        facility: dto.facility || null,
        doctorName: dto.doctorName || null,
        diseases: dto.diseases || [],
        medicines: dto.medicines || [],
        procedureName: dto.procedureName || null,
        source: TimelineSource.MANUAL,
      },
    });

    // Sync to memory (fire-and-forget)
    this.memorySynchronizer.onTimelineCreated(userId, {
      eventType: event.eventType,
      eventDate: event.eventDate,
      endDate: event.endDate,
      title: event.title,
      description: event.description,
      severity: event.severity,
      facility: event.facility,
      doctorName: event.doctorName,
      diseases: event.diseases,
      medicines: event.medicines,
      procedureName: event.procedureName,
    });
    this.memoryLogger.debug('TIMELINE_MEMORY_SYNC_TRIGGERED', { eventId: event.id });

    return TimelineEventDto.fromPrisma(event);
  }

  /**
   * Delete a timeline event.
   */
  async remove(clerkId: string, id: string): Promise<void> {
    const userId = await this.getInternalUserId(clerkId);
    const event = await this.prisma.timeline.findFirst({
      where: { id, userId },
    });

    if (!event) {
      throw new NotFoundException("Timeline event not found");
    }

    await this.prisma.timeline.delete({ where: { id } });
  }

  /**
   * Get an AI-generated narrative summary of the last month's timeline events.
   */
  async getAISummary(clerkId: string, patientId?: string): Promise<AITimelineSummaryDto> {
    const userId = await this.getInternalUserId(clerkId);
    let targetUserId = userId;

    if (patientId && patientId !== userId) {
      const hasAccess = await this.familyService.verifyAccess(userId, patientId);
      if (!hasAccess) throw new ForbiddenException('You do not have access to this patient\'s records');
      targetUserId = patientId;
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const periodEnd = now;

    const events = await this.prisma.timeline.findMany({
      where: {
        userId: targetUserId,
        eventDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      orderBy: { eventDate: "desc" },
    });

    if (events.length === 0) {
      return new AITimelineSummaryDto({
        summary: 'No medical documents or timeline events recorded yet. Upload your first medical report, prescription, or lab test to start tracking and generate your AI health summary.',
        keyEvents: [],
        trends: [],
        recommendations: [],
        totalEventsInPeriod: 0,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      });
    }

    const periodLabel = `${periodStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${periodEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    // Generate AI summary (with fallback)
    const aiResult = await this.aiService.summarizeTimeline(events, periodLabel, userId);

    return new AITimelineSummaryDto({
      summary: aiResult.summary || 'No summary available.',
      keyEvents: aiResult.keyEvents || [],
      trends: aiResult.trends || [],
      recommendations: aiResult.recommendations || [],
      totalEventsInPeriod: events.length,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    });
  }

  /**
   * Get a summary of timeline events grouped by type and month.
   */
  async getSummary(clerkId: string, patientId?: string): Promise<TimelineSummaryDto> {
    const userId = await this.getInternalUserId(clerkId);
    let targetUserId = userId;

    if (patientId && patientId !== userId) {
      const hasAccess = await this.familyService.verifyAccess(userId, patientId);
      if (!hasAccess) throw new ForbiddenException('You do not have access to this patient\'s records');
      targetUserId = patientId;
    }

    const allEvents = await this.prisma.timeline.findMany({
      where: { userId: targetUserId },
      orderBy: { eventDate: "desc" },
    });

    const byType: Record<string, number> = {};
    const byMonth: Record<string, number> = {};

    for (const event of allEvents) {
      byType[event.eventType] = (byType[event.eventType] || 0) + 1;
      const monthKey = `${event.eventDate.getFullYear()}-${String(event.eventDate.getMonth() + 1).padStart(2, "0")}`;
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    }

    return {
      totalEvents: allEvents.length,
      byType,
      byMonth,
      recentEvents: allEvents.slice(0, 5).map((e) => TimelineEventDto.fromPrisma(e)),
    };
  }

  /**
   * AI-generate timeline events from document extractions with memory context.
   */
  async generateFromExtractions(
    clerkId: string,
    extractionIds: string[],
  ): Promise<TimelineEventDto[]> {
    const userId = await this.getInternalUserId(clerkId);
    const extractions = await this.prisma.extraction.findMany({
      where: {
        id: { in: extractionIds },
        userId,
      },
    });

    if (extractions.length === 0) {
      this.logger.warn("No extractions found to generate timeline from");
      return [];
    }

    this.logger.log(`Generating timeline from ${extractions.length} extractions`);

    // Call Gemini to generate events (with memory context)
    const result = await this.aiService.generateTimeline(extractions, userId);

    // Create timeline events in DB
    const created: TimelineEventDto[] = [];

    for (const eventData of result.events) {
      const docId = eventData.sourceDocumentId;
      const doc = extractions.find((e) => e.documentId === docId);

      const event = await this.prisma.timeline.create({
        data: {
          userId,
          documentId: doc?.documentId || null,
          eventType: eventData.eventType || "OTHER",
          eventDate: new Date(eventData.eventDate || new Date()),
          endDate: eventData.endDate ? new Date(eventData.endDate) : null,
          title: eventData.title || "Medical event",
          description: eventData.description || null,
          severity: eventData.severity || null,
          facility: eventData.facility || null,
          doctorName: eventData.doctorName || null,
          diseases: eventData.diseases || [],
          medicines: eventData.medicines || [],
          procedureName: eventData.procedureName || null,
          labValues: eventData.labValues || {},
          source: TimelineSource.OCR,
        },
      });

      created.push(TimelineEventDto.fromPrisma(event));
    }

    this.logger.log(`Created ${created.length} timeline events`);
    return created;
  }
}
