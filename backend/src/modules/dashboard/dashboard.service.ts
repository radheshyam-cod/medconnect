import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DashboardStatsDto, RecentDocumentDto, RecentLabResultDto } from './dto/dashboard-response.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getInternalUserId(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  async getStats(clerkId: string): Promise<DashboardStatsDto> {
    const userId = await this.getInternalUserId(clerkId);

    // Calculate start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    // Run all queries in parallel for efficiency
    const [
      documentsThisMonth,
      totalDocuments,
      activeMedications,
      totalLabResults,
      upcomingRemindersToday,
      recentDocumentsRaw,
      recentLabResultsRaw,
    ] = await Promise.all([
      // Documents created this month
      this.prisma.document.count({
        where: {
          userId,
          createdAt: { gte: startOfMonth },
        },
      }),

      // Total documents
      this.prisma.document.count({
        where: { userId },
      }),

      // Active medications
      this.prisma.medication.count({
        where: { userId, isActive: true },
      }),

      // Total lab results
      this.prisma.labResult.count({
        where: { userId },
      }),

      // Upcoming medication reminders for today
      this.prisma.medicationReminder.count({
        where: {
          isTaken: false,
          daysOfWeek: { has: dayOfWeek },
          medication: {
            userId,
            isActive: true,
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        },
      }),

      // Recent documents (last 5)
      this.prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          fileName: true,
          documentType: true,
          status: true,
          createdAt: true,
        },
      }),

      // Recent lab results (last 5)
      this.prisma.labResult.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 5,
        select: {
          id: true,
          testName: true,
          value: true,
          unit: true,
          isAbnormal: true,
          date: true,
        },
      }),
    ]);

    return new DashboardStatsDto({
      documentsThisMonth,
      totalDocuments,
      activeMedications,
      totalLabResults,
      upcomingRemindersToday,
      recentDocuments: recentDocumentsRaw.map(
        (d) => new RecentDocumentDto(d),
      ),
      recentLabResults: recentLabResultsRaw.map(
        (l) => new RecentLabResultDto(l),
      ),
    });
  }
}
