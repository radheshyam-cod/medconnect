import { Test, TestingModule } from '@nestjs/testing';
import { Document } from '@prisma/client';
import { OcrService } from './ocr.service';
import { PrismaService } from '../database/prisma.service';
import { GeminiService } from '../ai/gemini.service';
import { STORAGE_TOKEN } from '../storage/interfaces/storage.interface';
import { ConfigService } from '@nestjs/config';
import { MemorySynchronizer } from '../memory/memory-synchronizer.service';
import { AIContextService } from '../ai-context/ai-context.service';
import { MemoryLogger } from '../memory/memory-logger.service';

// Mock DocumentProcessorServiceClient before testing module is created
jest.mock('@google-cloud/documentai', () => {
  return {
    DocumentProcessorServiceClient: jest.fn().mockImplementation(() => ({
      processDocument: jest.fn().mockResolvedValue([{
        document: { text: 'Mocked OCR Text' }
      }])
    }))
  };
});

describe('OcrService', () => {
  let service: OcrService;
  let prisma: PrismaService;
  let aiService: GeminiService;
  let storage: { downloadFile: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        {
          provide: PrismaService,
          useValue: {
            document: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            extraction: {
              create: jest.fn(),
            }
          },
        },
        {
          provide: GeminiService,
          useValue: {
            extractMedicalData: jest.fn(),
          },
        },
        {
          provide: STORAGE_TOKEN,
          useValue: {
            downloadFile: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'GCP_PROJECT_ID') return 'test-project';
              if (key === 'DOCUMENT_AI_LOCATION') return 'us';
              if (key === 'DOCUMENT_AI_PROCESSOR_ID') return 'processor-123';
              return null;
            }),
          },
        },
        {
          provide: MemorySynchronizer,
          useValue: {
            onExtractionCompleted: jest.fn(),
            onDocumentUploaded: jest.fn(),
          },
        },
        {
          provide: AIContextService,
          useValue: {
            buildExtractionContext: jest.fn(),
            buildTimelineContext: jest.fn(),
            buildSummaryContext: jest.fn(),
          },
        },
        {
          provide: MemoryLogger,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
    prisma = module.get<PrismaService>(PrismaService);
    aiService = module.get<GeminiService>(GeminiService);
    storage = module.get(STORAGE_TOKEN);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processDocument', () => {
    it('should throw error if document not found', async () => {
      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(null);
      await expect(service.processDocument('invalid-id')).rejects.toThrow('Document not found');
    });

    it('should process document successfully, extract data, and save to database', async () => {
      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue({
        id: 'doc_123',
        userId: 'user_123',
        storageBucket: 'test-bucket',
        storagePath: 'test-path.pdf',
        fileType: 'application/pdf',
      } as unknown as Document);

      storage.downloadFile.mockResolvedValue(Buffer.from('dummy-file-content'));

      const mockedExtraction = {
        diseases: ['Diabetes'],
        medicines: ['Metformin'],
        doctors: [],
        hospitals: [],
        labValues: [],
        dates: [],
        procedures: []
      };
      jest.spyOn(aiService, 'extractMedicalData').mockResolvedValue(mockedExtraction);

      await service.processDocument('doc_123');

      // 1. Fetch doc
      expect(prisma.document.findUnique).toHaveBeenCalledWith({ where: { id: 'doc_123' }});

      // 2. Set to PROCESSING
      expect(prisma.document.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'doc_123' },
        data: { status: 'PROCESSING' }
      }));

      // 3. Storage download
      expect(storage.downloadFile).toHaveBeenCalledWith('test-bucket', 'test-path.pdf');

      // 4. AI extraction with memory context (userId as second param)
      expect(aiService.extractMedicalData).toHaveBeenCalledWith('Mocked OCR Text', 'user_123');

      // 5. DB Save extraction
      expect(prisma.extraction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          documentId: 'doc_123',
          userId: 'user_123',
          rawOcrText: 'Mocked OCR Text',
          diseases: ['Diabetes'],
        })
      }));

      // 6. Set to COMPLETED
      expect(prisma.document.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'doc_123' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }));
    });

    it('should set status to FAILED if an error occurs during processing', async () => {
      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue({
        id: 'doc_123',
        userId: 'user_123',
      } as unknown as Document);

      storage.downloadFile.mockRejectedValue(new Error('Storage failure'));

      await service.processDocument('doc_123');

      expect(prisma.document.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'doc_123' },
        data: { status: 'FAILED' }
      }));
    });
  });
});
