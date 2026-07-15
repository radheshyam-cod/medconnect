import { Injectable, Logger, Inject } from '@nestjs/common';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { PrismaService } from '../database/prisma.service';
import { GeminiService } from '../ai/gemini.service';
import { STORAGE_TOKEN, StorageService } from '../storage/interfaces/storage.interface';
import { ConfigService } from '@nestjs/config';
import { MemorySynchronizer } from '../memory/memory-synchronizer.service';
import { AIContextService } from '../ai-context/ai-context.service';
import { MemoryLogger } from '../memory/memory-logger.service';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private docaiClient: DocumentProcessorServiceClient;
  private readonly projectId: string;
  private readonly location: string;
  private readonly processorId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: GeminiService,
    @Inject(STORAGE_TOKEN) private readonly storage: StorageService,
    private readonly configService: ConfigService,
    private readonly memorySynchronizer: MemorySynchronizer,
    private readonly aiContextService: AIContextService,
    private readonly memoryLogger: MemoryLogger,
  ) {
    this.docaiClient = new DocumentProcessorServiceClient();
    this.projectId = this.configService.get<string>('GCP_PROJECT_ID') || '';
    this.location = this.configService.get<string>('DOCUMENT_AI_LOCATION') || 'us';
    this.processorId = this.configService.get<string>('DOCUMENT_AI_PROCESSOR_ID') || '';
  }

  async processDocument(documentId: string) {
    this.logger.log(`Processing document: ${documentId}`);
    
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');
    
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' }
    });

    try {
      // 1. Download from Supabase
      const fileBuffer = await this.downloadFromSupabase(doc.storageBucket, doc.storagePath);

      // 2. Extract Text using Google Document AI
      const rawText = await this.extractTextWithDocAI(fileBuffer, doc.fileType);

      // 3. Extract Structured Medical Data using Gemini (with memory context)
      const structuredData = await this.aiService.extractMedicalData(rawText, doc.userId);

      // 4. Save to Database
      const extraction = await this.prisma.extraction.create({
        data: {
          documentId: doc.id,
          userId: doc.userId,
          rawOcrText: rawText,
          diseases: structuredData.diseases || [],
          medicines: structuredData.medicines || [],
          doctors: structuredData.doctors || [],
          hospitals: structuredData.hospitals || [],
          labValues: structuredData.labValues || [],
          dates: structuredData.dates || [],
          procedures: structuredData.procedures || [],
        }
      });

      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'COMPLETED' }
      });

      // 5. Trigger memory sync (fire-and-forget)
      this.memorySynchronizer.onExtractionCompleted(
        doc.userId,
        extraction.id,
        structuredData,
      );

      this.memoryLogger.debug('OCR_MEMORY_SYNC_TRIGGERED', {
        documentId,
        extractionId: extraction.id,
      });

    } catch (error) {
      this.logger.error(`Failed to process document ${documentId}`, error);
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED' }
      });
    }
  }

  private async downloadFromSupabase(bucket: string, path: string): Promise<Buffer> {
    this.logger.debug(`Downloading file from bucket: ${bucket}, path: ${path}`);
    return this.storage.downloadFile(bucket, path);
  }

  private async extractTextWithDocAI(fileBuffer: Buffer, mimeType: string): Promise<string> {
    if (!this.projectId || !this.processorId) {
      this.logger.warn('Document AI is not configured. Falling back to dummy OCR.');
      return 'Dummy extracted text. Please configure GCP_PROJECT_ID and DOCUMENT_AI_PROCESSOR_ID.';
    }

    this.logger.debug(`Extracting text with Document AI from ${mimeType}`);
    const name = `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;

    const request = {
      name,
      rawDocument: {
        content: fileBuffer.toString('base64'),
        mimeType: mimeType,
      },
    };

    try {
      const [result] = await this.docaiClient.processDocument(request);
      return result.document?.text || '';
    } catch (error) {
      this.logger.error('Document AI processing failed', error);
      throw error;
    }
  }
}
