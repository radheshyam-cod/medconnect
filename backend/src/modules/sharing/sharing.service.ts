import { Injectable, Logger, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SharingService {
  private readonly logger = new Logger(SharingService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getInternalUserId(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  async listLinks(clerkId: string) {
    const userId = await this.getInternalUserId(clerkId);
    return this.prisma.shareLink.findMany({
      where: { userId, isRevoked: false },
      include: { sharedResources: true, accessLogs: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createLink(clerkId: string, title: string, expiresInDays: number = 7, resources: { resourceType: string; resourceId: string }[]) {
    const userId = await this.getInternalUserId(clerkId);
    
    // Generate an expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    try {
      return await this.prisma.shareLink.create({
        data: {
          userId,
          title,
          expiresAt,
          sharedResources: {
            create: resources.map(r => ({
              resourceType: r.resourceType,
              resourceId: r.resourceId
            }))
          }
        },
        include: { sharedResources: true }
      });
    } catch (error) {
      this.logger.error(`Failed to create share link: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create share link. Please ensure the resources are valid.');
    }
  }

  async revokeLink(clerkId: string, id: string) {
    const userId = await this.getInternalUserId(clerkId);
    
    const link = await this.prisma.shareLink.findUnique({ where: { id } });
    if (!link || link.userId !== userId) {
      throw new NotFoundException('Share link not found or unauthorized');
    }

    return this.prisma.shareLink.update({
      where: { id },
      data: { isRevoked: true }
    });
  }

  // Public endpoint for a doctor to fetch shared resources
  async getPublicSharedData(token: string) {
    const link = await this.prisma.shareLink.findUnique({
      where: { token },
      include: {
        user: { select: { fullName: true, email: true } },
        sharedResources: true
      }
    });

    if (!link || link.isRevoked) {
      throw new UnauthorizedException('Share link is invalid or revoked');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new UnauthorizedException('Share link has expired');
    }

    // Log the access
    await this.prisma.accessLog.create({
      data: {
        shareLinkId: link.id,
        action: 'VIEW_SUMMARY'
      }
    });

    // Fetch comprehensive clinical data for the shared summary
    const [
      patientProfile,
      doctorSummary,
      medications,
      timelineEvents,
      documents,
      labResults
    ] = await Promise.all([
      this.prisma.patientProfile.findUnique({ where: { userId: link.userId } }),
      this.prisma.doctorSummary.findFirst({
        where: { userId: link.userId },
        orderBy: { generatedAt: 'desc' }
      }),
      this.prisma.medication.findMany({
        where: { userId: link.userId, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      this.prisma.timeline.findMany({
        where: { userId: link.userId },
        orderBy: { eventDate: 'desc' },
        take: 50
      }),
      this.prisma.document.findMany({
        where: { userId: link.userId },
        orderBy: { documentDate: 'desc' },
        take: 50
      }),
      this.prisma.labResult.findMany({
        where: { userId: link.userId },
        orderBy: { date: 'desc' },
        take: 50
      })
    ]);

    return {
      ...link,
      clinicalData: {
        patientProfile,
        doctorSummary,
        medications,
        timelineEvents,
        documents,
        labResults
      }
    };
  }
}
