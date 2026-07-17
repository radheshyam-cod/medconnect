import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SearchResultDto } from './dto/search.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getInternalUserId(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  async searchRecords(clerkId: string, query: string): Promise<SearchResultDto[]> {
    const userId = await this.getInternalUserId(clerkId);
    
    // We use Prisma's contains search (case-insensitive) across the main tables
    const searchCondition = { contains: query, mode: 'insensitive' as const };

    const [timelines, medications, labs, documents] = await Promise.all([
      this.prisma.timeline.findMany({
        where: {
          userId,
          OR: [
            { title: searchCondition },
            { description: searchCondition },
            { facility: searchCondition },
            { doctorName: searchCondition }
          ]
        },
        take: 20,
        orderBy: { eventDate: 'desc' }
      }),
      this.prisma.medication.findMany({
        where: {
          userId,
          OR: [
            { name: searchCondition },
            { dosage: searchCondition },
            { notes: searchCondition }
          ]
        },
        take: 20,
        orderBy: { startDate: 'desc' }
      }),
      this.prisma.labResult.findMany({
        where: {
          userId,
          OR: [
            { testName: searchCondition },
            { category: searchCondition }
          ]
        },
        take: 20,
        orderBy: { date: 'desc' }
      }),
      this.prisma.document.findMany({
        where: {
          userId,
          OR: [
            { fileName: searchCondition },
          ]
        },
        take: 20,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const results: SearchResultDto[] = [];

    timelines.forEach((t) => results.push({
      id: t.id,
      type: 'TIMELINE',
      title: t.title,
      description: t.description || undefined,
      date: t.eventDate,
      metadata: { eventType: t.eventType }
    }));

    medications.forEach((m) => results.push({
      id: m.id,
      type: 'MEDICATION',
      title: m.name,
      description: m.dosage ? `${m.dosage} - ${m.frequency || ''}` : undefined,
      date: m.startDate || m.createdAt,
      metadata: { isActive: m.isActive }
    }));

    labs.forEach((l) => results.push({
      id: l.id,
      type: 'LAB_RESULT',
      title: l.testName,
      description: `Value: ${l.value} ${l.unit || ''}`,
      date: l.date,
      metadata: { isAbnormal: l.isAbnormal }
    }));

    documents.forEach((d) => results.push({
      id: d.id,
      type: 'DOCUMENT',
      title: d.fileName,
      description: `File Size: ${(d.fileSize / 1024 / 1024).toFixed(2)} MB`,
      date: d.documentDate || d.createdAt,
      metadata: { fileType: d.fileType, status: d.status }
    }));

    // Sort aggregated results by date descending
    return results.sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
