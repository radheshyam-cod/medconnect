import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { PrismaService } from '../database/prisma.service';
import { MemorySynchronizer } from '../memory/memory-synchronizer.service';
import { MemoryLogger } from '../memory/memory-logger.service';
import { FamilyService } from '../family/family.service';
import { ForbiddenException } from '@nestjs/common';

@Injectable()
export class LabsService {
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

  private getDefaultReferenceRange(testName: string): string {
    const name = testName.toLowerCase();
    if (name.includes('hba1c') || name.includes('a1c')) return '< 5.7%';
    if (name.includes('glucose') || name.includes('sugar')) return '70 - 99 mg/dL';
    if (name.includes('cholesterol')) return '< 200 mg/dL';
    if (name.includes('hemoglobin') || name.includes('hb')) return '13.5 - 17.5 g/dL';
    if (name.includes('platelet')) return '150 - 450 thousand/uL';
    if (name.includes('white blood') || name.includes('wbc')) return '4.5 - 11.0 thousand/uL';
    if (name.includes('creatinine')) return '0.74 - 1.35 mg/dL';
    if (name.includes('vitamin d')) return '30 - 100 ng/mL';
    if (name.includes('blood pressure') || name.includes('bp')) return '120/80 mmHg';
    return 'Standard reference range';
  }

  async create(createLabDto: CreateLabDto, clerkId: string) {
    const userId = await this.getInternalUserId(clerkId);
    const referenceRange = (createLabDto.referenceRange && createLabDto.referenceRange.trim())
      ? createLabDto.referenceRange
      : this.getDefaultReferenceRange(createLabDto.testName);

    const labResult = await this.prisma.labResult.create({
      data: {
        ...(createLabDto as unknown as Prisma.LabResultUncheckedCreateInput),
        referenceRange,
        userId,
      },
    });

    // Sync to memory (fire-and-forget)
    this.memorySynchronizer.onLabCreated(userId, {
      id: labResult.id,
      testName: labResult.testName,
      value: labResult.value,
      unit: labResult.unit,
      isAbnormal: labResult.isAbnormal,
      date: labResult.date,
      category: labResult.category,
    });
    this.memoryLogger.debug('LAB_MEMORY_SYNC_TRIGGERED', { labId: labResult.id });

    return {
      ...labResult,
      referenceRange: labResult.referenceRange || this.getDefaultReferenceRange(labResult.testName),
    };
  }

  async findAll(clerkId: string, options: { page: number, limit: number, patientId?: string }) {
    const userId = await this.getInternalUserId(clerkId);
    let targetUserId = userId;

    if (options.patientId && options.patientId !== userId) {
      const hasAccess = await this.familyService.verifyAccess(userId, options.patientId);
      if (!hasAccess) throw new ForbiddenException('You do not have access to this patient\'s records');
      targetUserId = options.patientId;
    }
    
    const skip = (options.page - 1) * options.limit;

    const [results, total] = await Promise.all([
      this.prisma.labResult.findMany({
        where: { userId: targetUserId },
        orderBy: { date: 'desc' },
        skip,
        take: options.limit,
      }),
      this.prisma.labResult.count({ where: { userId: targetUserId } })
    ]);

    const normalizedResults = results.map((lab) => ({
      ...lab,
      referenceRange: lab.referenceRange?.trim() ? lab.referenceRange : this.getDefaultReferenceRange(lab.testName),
    }));

    return {
      results: normalizedResults,
      total,
      page: options.page,
      limit: options.limit
    };
  }

  async findOne(id: string, clerkId: string, patientId?: string) {
    const userId = await this.getInternalUserId(clerkId);
    let targetUserId = userId;

    if (patientId && patientId !== userId) {
      const hasAccess = await this.familyService.verifyAccess(userId, patientId);
      if (!hasAccess) throw new ForbiddenException('You do not have access to this patient\'s records');
      targetUserId = patientId;
    }

    const lab = await this.prisma.labResult.findFirst({
      where: { id, userId: targetUserId },
    });
    if (!lab) throw new NotFoundException('Lab result not found');
    return {
      ...lab,
      referenceRange: lab.referenceRange?.trim() ? lab.referenceRange : this.getDefaultReferenceRange(lab.testName),
    };
  }

  async update(id: string, updateLabDto: UpdateLabDto, clerkId: string) {
    const userId = await this.getInternalUserId(clerkId);
    await this.findOne(id, clerkId); // Verify ownership

    const updated = await this.prisma.labResult.update({
      where: { id },
      data: updateLabDto as unknown as Prisma.LabResultUncheckedUpdateInput,
    });

    // Sync to memory (fire-and-forget)
    this.memorySynchronizer.onLabUpdated(userId, {
      id: updated.id,
      testName: updated.testName,
      value: updated.value,
      unit: updated.unit,
      isAbnormal: updated.isAbnormal,
      date: updated.date,
      category: updated.category,
    });
    this.memoryLogger.debug('LAB_UPDATE_MEMORY_SYNC_TRIGGERED', { labId: updated.id });

    return updated;
  }

  async remove(id: string, clerkId: string) {
    const userId = await this.getInternalUserId(clerkId);
    const lab = await this.findOne(id, clerkId); // Verify ownership

    // Sync deletion to memory (fire-and-forget)
    this.memorySynchronizer.onLabUpdated(userId, {
      id: lab.id,
      testName: lab.testName,
      value: lab.value,
      unit: lab.unit,
      isAbnormal: lab.isAbnormal,
      date: lab.date,
      category: lab.category,
      action: 'deleted',
    });
    this.memoryLogger.debug('LAB_DELETE_MEMORY_SYNC_TRIGGERED', { labId: lab.id });

    return this.prisma.labResult.delete({
      where: { id },
    });
  }
}
