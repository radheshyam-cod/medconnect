import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DashboardStatsDto, RecentDocumentDto, RecentLabResultDto } from './dto/dashboard-response.dto';
import { FamilyService } from '../family/family.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly familyService: FamilyService
  ) {}

  private async getInternalUserId(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  async getStats(clerkId: string, patientId?: string): Promise<DashboardStatsDto> {
    const userId = await this.getInternalUserId(clerkId);
    let targetUserId = userId;

    if (patientId && patientId !== userId) {
      const hasAccess = await this.familyService.verifyAccess(userId, patientId);
      if (!hasAccess) throw new ForbiddenException('You do not have access to this patient\'s records');
      targetUserId = patientId;
    }

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
      patientProfile,
    ] = await Promise.all([
      // Documents created this month
      this.prisma.document.count({
        where: {
          userId: targetUserId,
          createdAt: { gte: startOfMonth },
        },
      }),

      // Total documents
      this.prisma.document.count({
        where: { userId: targetUserId },
      }),

      // Active medications
      this.prisma.medication.count({
        where: { userId: targetUserId, isActive: true },
      }),

      // Total lab results
      this.prisma.labResult.count({
        where: { userId: targetUserId },
      }),

      // Upcoming medication reminders for today
      this.prisma.medicationReminder.count({
        where: {
          isTaken: false,
          daysOfWeek: { has: dayOfWeek },
          medication: {
            userId: targetUserId,
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
        where: { userId: targetUserId },
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
        where: { userId: targetUserId },
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

      // Patient Profile
      this.prisma.patientProfile.findUnique({
        where: { userId: targetUserId },
      })
    ]);

    // Calculate Health Score
    let healthScore = 85; // Strong base score
    if (activeMedications > 0) healthScore -= Math.min(activeMedications * 2, 10);
    if (upcomingRemindersToday > 2) healthScore -= 3;
    const abnormalLabs = recentLabResultsRaw.filter(l => l.isAbnormal).length;
    healthScore -= (abnormalLabs * 5);

    // Profile completeness points
    if (patientProfile) {
      if (patientProfile.bloodGroup) healthScore += 2;
      if (patientProfile.emergencyContact) healthScore += 5; // Vital to have emergency contact
      if (patientProfile.allergies && patientProfile.allergies.length > 0) healthScore -= 2; // Slight deduct for having allergies
    }

    if (documentsThisMonth > 0) healthScore += 5; // Reward for active tracking
    if (documentsThisMonth > 5) healthScore += 2; 

    // Clamp score between 0 and 100
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

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
      healthScore,
      patientProfile,
    });
  }
}
