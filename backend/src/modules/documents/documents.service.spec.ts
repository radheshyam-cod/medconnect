import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { STORAGE_TOKEN } from '../storage/interfaces/storage.interface';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProcessingStatus } from '@prisma/client';
import { MemorySynchronizer } from '../memory/memory-synchronizer.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: PrismaService;
  let storage: any;
  let ocrQueue: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn() },
            document: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-bucket'),
          },
        },
        {
          provide: STORAGE_TOKEN,
          useValue: {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
            getSignedUrl: jest.fn(),
          },
        },
        {
          provide: getQueueToken('ocr'),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: MemorySynchronizer,
          useValue: {
            onDocumentUploaded: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    prisma = module.get<PrismaService>(PrismaService);
    storage = module.get(STORAGE_TOKEN);
    ocrQueue = module.get(getQueueToken('ocr'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      
      const file = {
        mimetype: 'application/pdf',
        size: 1024,
        originalname: 'test.pdf',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      await expect(service.upload('clerk_123', file)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if file type is unsupported', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'user_123' } as any);
      
      const file = {
        mimetype: 'application/xml', // invalid
        size: 1024,
        originalname: 'test.xml',
      } as Express.Multer.File;

      await expect(service.upload('clerk_123', file)).rejects.toThrow(BadRequestException);
    });

    it('should successfully upload and enqueue document', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'user_123' } as any);
      storage.uploadFile.mockResolvedValue({ path: 'user_123/uuid.pdf', publicUrl: 'http://example.com' });
      jest.spyOn(prisma.document, 'create').mockResolvedValue({
        id: 'doc_123',
        userId: 'user_123',
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        status: ProcessingStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const file = {
        mimetype: 'application/pdf',
        size: 1024,
        originalname: 'test.pdf',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const result = await service.upload('clerk_123', file);
      
      expect(result).toBeDefined();
      expect(result.id).toEqual('doc_123');
      expect(storage.uploadFile).toHaveBeenCalled();
      expect(prisma.document.create).toHaveBeenCalled();
      expect(ocrQueue.add).toHaveBeenCalledWith('process-document', { documentId: 'doc_123' });
    });
  });

  describe('findOne', () => {
    it('should return document details if found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'user_123' } as any);
      jest.spyOn(prisma.document, 'findFirst').mockResolvedValue({
        id: 'doc_123',
        userId: 'user_123',
        extractions: [],
      } as any);

      const result = await service.findOne('clerk_123', 'doc_123');
      expect(result.id).toEqual('doc_123');
    });

    it('should throw NotFoundException if document not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'user_123' } as any);
      jest.spyOn(prisma.document, 'findFirst').mockResolvedValue(null);

      await expect(service.findOne('clerk_123', 'doc_123')).rejects.toThrow(NotFoundException);
    });
  });
});
