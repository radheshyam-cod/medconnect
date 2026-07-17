import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { PrismaService } from '../database/prisma.service';
import { MemorySynchronizer } from '../memory/memory-synchronizer.service';
import { MemoryLogger } from '../memory/memory-logger.service';

@Injectable()
export class LabsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memorySynchronizer: MemorySynchronizer,
    private readonly memoryLogger: MemoryLogger,
  ) {}

  private async getInternalUserId(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  async create(createLabDto: CreateLabDto, clerkId: string) {
    const userId = await this.getInternalUserId(clerkId);
    const labResult = await this.prisma.labResult.create({
      data: {
        ...(createLabDto as unknown as Prisma.LabResultUncheckedCreateInput),
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

    return labResult;
  }

  async findAll(clerkId: string, options: { page: number, limit: number }) {
    const userId = await this.getInternalUserId(clerkId);
    
    const skip = (options.page - 1) * options.limit;

    const [results, total] = await Promise.all([
      this.prisma.labResult.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        skip,
        take: options.limit,
      }),
      this.prisma.labResult.count({ where: { userId } })
    ]);

    return {
      results,
      total,
      page: options.page,
      limit: options.limit
    };
  }

  async findOne(id: string, clerkId: string) {
    const userId = await this.getInternalUserId(clerkId);
    const lab = await this.prisma.labResult.findFirst({
      where: { id, userId },
    });
    if (!lab) throw new NotFoundException('Lab result not found');
    return lab;
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
