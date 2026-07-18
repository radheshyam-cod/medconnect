import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { PrismaService } from '../database/prisma.service';
import { MemorySynchronizer } from '../memory/memory-synchronizer.service';
import { MemoryLogger } from '../memory/memory-logger.service';
import { FamilyService } from '../family/family.service';
import { ForbiddenException } from '@nestjs/common';

@Injectable()
export class MedicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memorySynchronizer: MemorySynchronizer,
    private readonly memoryLogger: MemoryLogger,
    private readonly familyService: FamilyService,
  ) {}

  private async getInternalUserId(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  async create(createMedicationDto: CreateMedicationDto, clerkId: string) {
    const userId = await this.getInternalUserId(clerkId);
    const medication = await this.prisma.medication.create({
      data: {
        ...(createMedicationDto as unknown as Prisma.MedicationUncheckedCreateInput),
        userId,
      },
    });

    // Sync to memory (fire-and-forget)
    this.memorySynchronizer.onMedicationCreated(userId, {
      id: medication.id,
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      isActive: medication.isActive,
      startDate: medication.startDate,
    });
    this.memoryLogger.debug('MEDICATION_MEMORY_SYNC_TRIGGERED', { medicationId: medication.id });

    return medication;
  }

  async findAll(clerkId: string, options?: { isActive?: boolean; patientId?: string }) {
    const userId = await this.getInternalUserId(clerkId);
    let targetUserId = userId;

    if (options?.patientId && options.patientId !== userId) {
      const hasAccess = await this.familyService.verifyAccess(userId, options.patientId);
      if (!hasAccess) throw new ForbiddenException('You do not have access to this patient\'s records');
      targetUserId = options.patientId;
    }

    // Auto-deactivate medications that have passed their endDate
    try {
      await this.prisma.medication.updateMany({
        where: {
          userId: targetUserId,
          isActive: true,
          endDate: {
            lt: new Date(),
          },
        },
        data: {
          isActive: false,
        },
      });
    } catch (error) {
      // Ignore errors for auto-update
    }

    const where: Prisma.MedicationWhereInput = { userId: targetUserId };
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return this.prisma.medication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, clerkId: string, patientId?: string) {
    const userId = await this.getInternalUserId(clerkId);
    let targetUserId = userId;

    if (patientId && patientId !== userId) {
      const hasAccess = await this.familyService.verifyAccess(userId, patientId);
      if (!hasAccess) throw new ForbiddenException('You do not have access to this patient\'s records');
      targetUserId = patientId;
    }

    const medication = await this.prisma.medication.findFirst({
      where: { id, userId: targetUserId },
    });
    if (!medication) throw new NotFoundException('Medication not found');
    return medication;
  }

  async update(id: string, updateMedicationDto: UpdateMedicationDto, clerkId: string) {
    const userId = await this.getInternalUserId(clerkId);
    await this.findOne(id, clerkId); // Verify ownership

    const updated = await this.prisma.medication.update({
      where: { id },
      data: updateMedicationDto as unknown as Prisma.MedicationUncheckedUpdateInput,
    });

    // Sync to memory (fire-and-forget)
    this.memorySynchronizer.onMedicationUpdated(userId, {
      id: updated.id,
      name: updated.name,
      dosage: updated.dosage,
      frequency: updated.frequency,
      isActive: updated.isActive,
      startDate: updated.startDate,
    });
    this.memoryLogger.debug('MEDICATION_UPDATE_MEMORY_SYNC_TRIGGERED', { medicationId: updated.id });

    return updated;
  }

  async remove(id: string, clerkId: string) {
    const userId = await this.getInternalUserId(clerkId);
    const medication = await this.findOne(id, clerkId); // Verify ownership

    // Sync deletion to memory (fire-and-forget) before delete
    this.memorySynchronizer.onMedicationDeleted(
      userId,
      medication.id,
      medication.name,
    );
    this.memoryLogger.debug('MEDICATION_DELETE_MEMORY_SYNC_TRIGGERED', { medicationId: medication.id });

    return this.prisma.medication.delete({
      where: { id },
    });
  }
}
