import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../database/prisma.service";
import { STORAGE_TOKEN, StorageService } from "../storage/interfaces/storage.interface";
import { DocumentType, ProcessingStatus, Prisma } from "@prisma/client";
import { QueryDocumentDto } from "./dto/query-document.dto";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import { DocumentResponseDto, DocumentDetailResponseDto } from "./dto/document-response.dto";
import { v4 as uuidv4 } from "uuid";
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MemorySynchronizer } from '../memory/memory-synchronizer.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly storageBucket: string;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_TOKEN) private readonly storage: StorageService,
    private readonly configService: ConfigService,
    @InjectQueue('ocr') private readonly ocrQueue: Queue,
    private readonly memorySynchronizer: MemorySynchronizer,
  ) {
    this.storageBucket =
      this.configService.get<string>("SUPABASE_STORAGE_BUCKET") || "documents";
  }

  private async getInternalUserId(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  async upload(
    clerkId: string,
    file: Express.Multer.File,
    documentType?: DocumentType,
    documentDate?: string,
  ): Promise<DocumentResponseDto> {
    const userId = await this.getInternalUserId(clerkId);

    if (!file) {
      throw new BadRequestException("File is required");
    }

    // Validate file type
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/tiff",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed: PDF, JPEG, PNG, WebP, TIFF`,
      );
    }

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      throw new BadRequestException("File too large. Maximum size is 20MB");
    }

    // Generate unique storage path
    const extension = file.originalname.split(".").pop() || "bin";
    const storagePath = `${userId}/${uuidv4()}.${extension}`;

    this.logger.log(`Uploading file: ${file.originalname} (${file.size} bytes)`);

    // Upload to Supabase Storage
    const uploadResult = await this.storage.uploadFile(
      this.storageBucket,
      storagePath,
      file.buffer,
      file.mimetype,
    );

    // Create database record
    const document = await this.prisma.document.create({
      data: {
        userId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storagePath: uploadResult.path,
        storageBucket: this.storageBucket,
        publicUrl: uploadResult.publicUrl,
        documentType: documentType || null,
        documentDate: documentDate ? new Date(documentDate) : null,
        status: ProcessingStatus.PENDING,
      },
    });

    this.logger.log(`Document created: ${document.id}`);

    // Enqueue OCR processing job
    await this.ocrQueue.add('process-document', { documentId: document.id });

    // Trigger memory sync (fire-and-forget)
    this.memorySynchronizer.onDocumentUploaded(userId, document.id, file.originalname);

    return DocumentResponseDto.fromPrisma(document);
  }

  async findAll(
    clerkId: string,
    queryParams: QueryDocumentDto,
  ): Promise<{ documents: DocumentResponseDto[]; total: number }> {
    const userId = await this.getInternalUserId(clerkId);

    // Get family groups where user is an accepted member
    const acceptedGroups = await this.prisma.familyGroupMember.findMany({
      where: {
        memberId: userId,
        status: 'ACCEPTED'
      },
      include: { group: true }
    });

    const allowedUserIds = [userId, ...acceptedGroups.map(g => g.group.ownerId)];

    const where: Prisma.DocumentWhereInput = { 
      userId: { in: allowedUserIds } 
    };

    if (queryParams.documentType) {
      where.documentType = queryParams.documentType;
    }

    if (queryParams.status) {
      where.status = queryParams.status;
    }

    if (queryParams.search) {
      where.OR = [
        { fileName: { contains: queryParams.search, mode: "insensitive" } },
      ];
    }

    if (queryParams.from || queryParams.to) {
      where.createdAt = {};
      if (queryParams.from) {
        where.createdAt.gte = new Date(queryParams.from);
      }
      if (queryParams.to) {
        where.createdAt.lte = new Date(queryParams.to);
      }
    }

    const orderBy: Prisma.DocumentOrderByWithRelationInput = {};
    if (queryParams.sort && queryParams.order) {
      orderBy[queryParams.sort as keyof Prisma.DocumentOrderByWithRelationInput] =
        queryParams.order;
    } else {
      orderBy.createdAt = "desc";
    }

    const page = queryParams.page || 1;
    const limit = queryParams.limit || 20;
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      documents: documents.map((doc) => DocumentResponseDto.fromPrisma(doc)),
      total,
    };
  }

  async findOne(clerkId: string, id: string): Promise<DocumentDetailResponseDto> {
    const userId = await this.getInternalUserId(clerkId);

    const acceptedGroups = await this.prisma.familyGroupMember.findMany({
      where: { memberId: userId, status: 'ACCEPTED' },
      include: { group: true }
    });
    const allowedUserIds = [userId, ...acceptedGroups.map(g => g.group.ownerId)];

    const document = await this.prisma.document.findFirst({
      where: { id, userId: { in: allowedUserIds } },
      include: {
        extractions: {
          take: 1,
          orderBy: { extractedAt: "desc" },
        },
      },
    });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    return DocumentDetailResponseDto.fromPrisma(document);
  }

  async update(
    clerkId: string,
    id: string,
    updateDto: UpdateDocumentDto,
  ): Promise<DocumentResponseDto> {
    const userId = await this.getInternalUserId(clerkId);
    const existing = await this.prisma.document.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException("Document not found");
    }

    const data: Prisma.DocumentUpdateInput = {};
    if (updateDto.documentType) data.documentType = updateDto.documentType;
    if (updateDto.documentDate) data.documentDate = new Date(updateDto.documentDate);
    if (updateDto.fileName) data.fileName = updateDto.fileName;

    const updated = await this.prisma.document.update({
      where: { id },
      data,
    });

    return DocumentResponseDto.fromPrisma(updated);
  }

  async remove(clerkId: string, id: string): Promise<void> {
    const userId = await this.getInternalUserId(clerkId);
    const document = await this.prisma.document.findFirst({
      where: { id, userId },
    });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    // Delete from storage first (best-effort; don't fail if storage delete fails)
    try {
      await this.storage.deleteFile(document.storageBucket, document.storagePath);
    } catch (err) {
      this.logger.warn(
        `Could not delete storage file: ${document.storagePath}`,
        err,
      );
    }

    // Delete from database (cascades to extractions, OCR errors)
    await this.prisma.document.delete({ where: { id } });

    this.logger.log(`Document deleted: ${id}`);
  }

  async getDownloadUrl(clerkId: string, id: string): Promise<string | null> {
    const userId = await this.getInternalUserId(clerkId);

    const acceptedGroups = await this.prisma.familyGroupMember.findMany({
      where: { memberId: userId, status: 'ACCEPTED' },
      include: { group: true }
    });
    const allowedUserIds = [userId, ...acceptedGroups.map(g => g.group.ownerId)];

    const document = await this.prisma.document.findFirst({
      where: { id, userId: { in: allowedUserIds } },
    });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    return this.storage.getSignedUrl(
      document.storageBucket,
      document.storagePath,
    );
  }
}
