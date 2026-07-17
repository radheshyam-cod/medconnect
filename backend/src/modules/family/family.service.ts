import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FamilyRelationType, PermissionLevel } from '@prisma/client';

@Injectable()
export class FamilyService {
  private readonly logger = new Logger(FamilyService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getInternalUserId(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  async getFamilyGroups(clerkId: string) {
    const userId = await this.getInternalUserId(clerkId);
    
    // Get groups I own
    const ownedGroups = await this.prisma.familyGroup.findMany({
      where: { ownerId: userId },
      include: {
        members: {
          include: { member: { select: { fullName: true, email: true } } }
        }
      }
    });

    // Get groups I am a member of
    const memberGroups = await this.prisma.familyGroupMember.findMany({
      where: { memberId: userId },
      include: {
        group: {
          include: {
            owner: { select: { fullName: true, email: true } }
          }
        }
      }
    });

    return {
      owned: ownedGroups,
      memberOf: memberGroups
    };
  }

  async createGroup(clerkId: string, name: string) {
    const userId = await this.getInternalUserId(clerkId);
    
    return this.prisma.familyGroup.create({
      data: {
        name,
        ownerId: userId
      }
    });
  }

  async inviteMember(clerkId: string, groupId: string, email: string, relation: FamilyRelationType) {
    const ownerId = await this.getInternalUserId(clerkId);
    
    // Check if group belongs to me
    const group = await this.prisma.familyGroup.findUnique({
      where: { id: groupId }
    });

    if (!group || group.ownerId !== ownerId) {
      throw new NotFoundException('Group not found or unauthorized');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find the user by email (case-insensitive)
    let invitedUser = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: 'insensitive',
        },
      },
    });

    if (!invitedUser) {
      // Create a pending placeholder user so family invitations can be sent before they sign up
      invitedUser = await this.prisma.user.create({
        data: {
          clerkId: `pending_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${cleanEmail}`,
          email: cleanEmail,
          fullName: cleanEmail.split('@')[0],
        },
      });
    }

    if (invitedUser.id === ownerId) {
      throw new BadRequestException('Cannot invite yourself');
    }

    // Check if already invited
    const existing = await this.prisma.familyGroupMember.findUnique({
      where: {
        groupId_memberId: {
          groupId,
          memberId: invitedUser.id
        }
      }
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new BadRequestException('User is already an active member of this family group');
      }
      // If already pending or rejected, update the relation and refresh invitation
      return this.prisma.familyGroupMember.update({
        where: { id: existing.id },
        data: {
          relation,
          status: 'PENDING',
          invitedBy: ownerId,
        }
      });
    }

    return this.prisma.familyGroupMember.create({
      data: {
        groupId,
        memberId: invitedUser.id,
        relation,
        permission: PermissionLevel.VIEWER,
        invitedBy: ownerId,
        status: 'PENDING'
      }
    });
  }

  async respondToInvite(clerkId: string, groupId: string, action: 'ACCEPT' | 'REJECT') {
    const userId = await this.getInternalUserId(clerkId);
    
    const membership = await this.prisma.familyGroupMember.findUnique({
      where: {
        groupId_memberId: {
          groupId,
          memberId: userId
        }
      }
    });

    if (!membership || membership.status !== 'PENDING') {
      throw new BadRequestException('No pending invitation found for this group');
    }

    if (action === 'ACCEPT') {
      return this.prisma.familyGroupMember.update({
        where: { id: membership.id },
        data: { status: 'ACCEPTED' }
      });
    } else {
      return this.prisma.familyGroupMember.delete({
        where: { id: membership.id }
      });
    }
  }
}
